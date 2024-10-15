import { SnapshotKafka, ImageFileSystem } from "../../tools/kafkaFile.tools";
import { NextFunction, Router, Request, Response } from "express";
import PersonImage from "../../db/mongo/models/personImage";
import { createMiddleware } from "../../db/mongo/create.database";
import { randomUuid, unpickle } from "../../tools/utils.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { AddNotifPersonnelBody } from "../../validation/dto/notifPersonnel.dto";
import mongoose from "mongoose";
import Personnel from "../../db/mongo/models/personnel";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { ApiError } from "../../types/classes/error.class";
import { hashString } from "../../tools/hash";
import { IPersonnel } from "../../types/interfaces/personnel.interface";
import { Kafka, logLevel } from "kafkajs";

const secret = process.env["SESSION_SECRET"];
//create customized redis client
const cfs = new ImageFileSystem();
//create customized redis client
//TODO: parallel requests will overwrite responses
const snapshotKafka = new SnapshotKafka();
//create router for add to server
const router: Router = Router();

//create api for upload image
router.post("/upload",
  cfs.uploadAvatarMiddleware("image_str", "perssonel_id"),
);

//create api for download image
router.get("/download/:fileName",
  cfs.downloadAvatarMiddleware("fileName"));

//create api for get list file upload
router.get("/list",
  cfs.listMiddleware());

router.post("/hostile",
  async (req, res, next) => {
    if (!req.body["image_str"] || !Array.isArray(req.body["image_str"]) || !req.body["image_str"].every(el => typeof el === "string")) return res.status(400).end();
    let data: any[] = [];
    let result: any[] = [];
    const code = randomUuid(4, "number").toString() + (new Date()).toLocaleDateString().split("/").map(el => ("0" + el + "0").slice(-3, -1)).join("")
    const person = await Personnel.create({
      tracked: !!req.body["tracked"],
      alert: !!req.body["alert"],
      first_name: 'Hostile',
      last_name: code,
      personnel_code: code,
    });
    for (const image_str of req.body["image_str"]) {
      await snapshotKafka.kafkaProduce({ image_str, "personnel_id": person.id, "soghra": "", });
      data.push(await snapshotKafka.kafkaGet(person));
    }
    for (const aiResult of data) {
      if (!!aiResult?.has_face) {
        try {
          const { hash } = cfs.uploadAvatar(person.id, aiResult["face"]);
          result.push(await PersonImage.create({
            "_id": aiResult["_id"],
            "hash_id": hash,
            "person_id": person._id,
            "vector": aiResult["embedding"]
          }));
        } catch (error) {
          console.log(error);
        }
      }
    }
    if (!result.length) await person.delete();
    return res.status(201).json({
      success: true,
      data: result
    })
  }
);

//api for upload image to redis
router.post("/kafka",
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaProduce, { save: "id", isInReq: true, next: true }, "personnel_id", "image_str", "soghra"),


  snapshotKafka.middlewareWraper(snapshotKafka.kafkaGet, { save: "redisData", isInReq: true, next: true }, "personnel_id"),
  //error check
  (req: Request, res: Response, next: NextFunction) => req.body["redisData"].has_face == true ? next() : res.status(406).send({ message: "No face found", }),
  //save base64 file in assets
  cfs.uploadAvatarMiddleware(["redisData", "face"], "personnel_id", { next: true }),
  //project redisData in req.body
  (req: Request, res: Response, next: NextFunction) => {
    req.body["_id"] = req.body["redisData"]["_id"];
    req.body["person_id"] = req.body["redisData"]["personnel_id"];
    req.body["vector"] = req.body["redisData"]["embedding"];
    // req.body["masked_embd"] = req.body["redisData"]["masked_embd"];
    req.body["hash_id"] = req.body["redisData"]["face"];
    // req.body["masked_face_id"] = req.body["redisData"]["masked_face"];
    return next();
  },
  //create PersonImage document
  createMiddleware(["person_id", "vector", "hash_id", "_id"], PersonImage, { next: false })
);

// //route for verified image in redis
// router.post("/verify",
//   snapshotKafka.middlewareWraper(snapshotKafka.kafkaGet, { save: "redisData", isInReq: true, next: true }, "id"),
//   //error check
//   (req: Request, res: Response, next: NextFunction) => req.body["redisData"].has_face == true ? next() : res.status(406).send({ message: "No face found", }),
//   //save base64 file in assets
//   cfs.uploadAvatarMiddleware(["redisData", "face"], "id", { next: true }),
//   //project redisData in req.body
//   (req: Request, res: Response, next: NextFunction) => {
//     req.body["person_id"] = req.body["redisData"]["personnel_id"];
//     req.body["vector"] = req.body["redisData"]["embedding"];
//     // req.body["masked_embd"] = req.body["redisData"]["masked_embd"];
//     req.body["hash_id"] = req.body["redisData"]["face"];
//     // req.body["masked_face_id"] = req.body["redisData"]["masked_face"];
//     return next();
//   },
//   //create PersonImage document
//   createMiddleware(["person_id", "vector", "hash_id", { "_id": (body: any) => new mongoose.Types.ObjectId().toHexString() }], PersonImage, { next: false })
// );

router.post("/search",
  (req: Request, res: Response, next: NextFunction) => {
    req.body.id = randomUuid(24);
    return next()
  },
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaProduce, { isInReq: true, next: true }, "image_str", "confidence", "id", "akbar"),
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaGet, { save: "redisData", isInReq: true, next: true }, "id"),
  //error check
  (req: Request, res: Response, next: NextFunction) => req.body["redisData"]?.has_face == true ?
    res.status(406).send({ message: "No face found", }) :
    res.status(200).send({
      success: true,
      data: req.body.redisData ?? "",
    })
);


router.post("/notifpersonnel",
  dtoValidationMiddleware(AddNotifPersonnelBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  (req: Request, res: Response, next: NextFunction) => {
    req.body["redisData"] = {}
    req.body["redisData"]["image_str"] = req.body["image_str"];
    req.body["redisData"]["_id"] = new mongoose.Types.ObjectId().toHexString();
    req.body["_id"] = req.body["redisData"]["_id"];
    req.body["redisData"]["vector"] = req.body["vector"];
    req.body["redisData"]["image_str"] = req.body["image_str"];
    req.body["redisData"]["confidence"] = req.body["confidence"];
    req.body["image_str"] = req.body["image_str"];
    return next();
  },
  //create PersonImage document
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaProduce, { isInReq: true, next: true }, "person_id", "vector", "hash_id", "confidence", "_id", "habil"),
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaGet, { save: "response_ai", isInReq: true, next: true }, "person_id"),
  ((req: Request, res: Response, next: NextFunction) => req.body["response_ai"]?.success == false ?
    res.status(400).send({ message: req.body["response_ai"]?.message, }) :
    next()),
  cfs.uploadAvatarMiddleware(["redisData", "image_str"], "person_id", { next: true }, "hash_id"),
  (req: Request, res: Response, next: NextFunction) => {
    req.body["hash_id"] = req.body["redisData"]["image_str"];
    req.body["redisData"]["image_str"] = req.body["image_str"];
    req.body["redisData"]["vector"] = req.body["vector"];
    req.body["redisData"]["confidence"] = req.body["confidence"];
    return next();
  },
  createMiddleware(["person_id", "vector", "hash_id", "confidence", "_id"], PersonImage, { next: true }),
  (req: Request, res: Response, next: NextFunction) => {
    res.status(201).send({
      success: true,
      data: req.body.redisData ?? "",
    })
  },
)

export default router;


// {
//   timestamp: "2024-01-28T16:10:15.988Z",
//   data: [
//     "65b4e28ba0fdd48af803a025",
//   ],
// }