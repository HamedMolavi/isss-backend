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

router.post("/batch",
  (req, res, next) => {
    if (!req.body['path'] || !existsSync(path.join('../../../face_DB', req.body['path']))) {
      return next(new ApiError(404, "No such directory!"));
    }
    req.body['personnel_id'] = Date.now().toString();
    return next();
  },
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaProduce, { save: "aiResult", isInReq: true, next: true }, "personnel_id", "path", "embedding"),
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaGet, { save: "redisData", isInReq: true, next: true }, "personnel_id"),
  async (req, res, next) => {
    const data: any = req.body['redisData'];
    const assetsDir = path.join('../../../assets/image');
    const success_dir = path.join('../../../face_DB', data['success_dir']);
    const picklePath = path.join(success_dir, 'embeddings.pkl');
    if (!data || !data['success_dir'] || !existsSync(picklePath)) {
      return next(new ApiError(500, "Internal error!"));
    }
    const imageData: { [key: string]: Array<number> } = await unpickle(picklePath) as any;
    for (const personnelCode_hashId in imageData) {
      try {
        const personnel_code = personnelCode_hashId.split("_")[1];
        if (Object.prototype.hasOwnProperty.call(imageData, personnelCode_hashId)) {
          const imagesDirPath = path.join(success_dir, personnel_code);
          if (!existsSync(imagesDirPath)) continue;
          let person = await Personnel.findOne({ personnel_code }).exec();
          if (!person) {
            person = new Personnel({ personnel_code });
            await person.save();
          }
          const personnel_id = person.id;
          const imagePaths = readdirSync(imagesDirPath).filter(file => (/\.(png|jpg|jpeg|bmp)$/i).test(file.toLowerCase())).map((file) => path.join(imagesDirPath, file));
          for (const imagePath of imagePaths) {
            const vector = imageData[personnelCode_hashId];
            const image64 = readFileSync(imagePath).toString('base64');
            const hash_id = hashString(image64, secret);
            const personnelImageDir = path.join(assetsDir, personnel_id);
            const name = `${personnel_id}-${hash_id}`;
            mkdirSync(personnelImageDir, { recursive: true });
            writeFileSync(path.join(personnelImageDir, `${name}.jpeg`), Buffer.from(image64, "base64"));
            const personImage = new PersonImage({ person_id: person._id, hash_id, vector });
            await personImage.save();
            unlinkSync(imagePath);
          }
        }
      } catch (error) {
        console.log(error);
      }
    }

    res.send({
      success: true,
    })
    const producer = new Kafka({
      logLevel: logLevel.ERROR,
      brokers: process.env["KAFKA_BOOTSTRAP"].split(","),
    }).producer();
    await producer.connect();
    await producer.send({
      topic: process.env["SIGNAL_TOPIC"],
      messages: [
        {
          key: "face",
          value: JSON.stringify({ signal: "restart", origin: "back", sender: "back" }),
        },
      ],
    })
    await producer.disconnect();
    return
  }
)
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