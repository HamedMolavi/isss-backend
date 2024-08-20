import { SnapshotKafka, ImageFileSystem } from "../../tools/kafkaFile.tools";
import { NextFunction, Router, Request, Response } from "express";
import PersonImage from "../../db/mongo/models/personImage";
import { createMiddleware } from "../../db/mongo/create.database";
import { randomUuid } from "../../tools/utils.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import mongoose from "mongoose";
import { AddHostilePerson, AddPersonImage } from "../../validation/dto/files.dto";
import { injectDataMiddleware } from "../../tools/request.tools";
import Personnel from "../../db/mongo/models/personnel";
import { allowedPassConvert } from "../../tools/time.tools";
import JobTitle from "../../db/mongo/models/jobTitle";

//create customized redis client
const cfs = new ImageFileSystem();
//create customized redis client
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
  dtoValidationMiddleware(AddHostilePerson, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  injectDataMiddleware((body: any) => ({ code: randomUuid(4, "number").toString() + (new Date()).toLocaleDateString().split("/").map(el => ("0" + el + "0").slice(-3, -1)).join("") }), { spread: true }),
  createMiddleware([
    { tracked: (body) => !!body["tracked"] },
    { alert: (body) => !!body["alert"] },
    { first_name: (body) => 'Hostile' },
    { last_name: (body) => body["code"] },
    { personnel_code: (body) => body["code"] }
  ], Personnel, { save: "person", next: true }),

  async (req, res, next) => {
    let data: any[] = [];
    let result: any[] = [];
    const person = req.body["person"];
    for (const image_str of req.body["image_str"]) {
      data.push(await snapshotKafka.kafkaSession({
        consumerId: person?.id, consumerKey: 'asghar', producerKey: 'soghra',
        producerInput: { image_str, personnel_id: person?.id }
      }))
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

router.post("/kafka",
  dtoValidationMiddleware(AddPersonImage, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaSession,
    (req) => [{
      producerKey: "soghra", consumerKey: "asghar",
      producerInput: { "personnel_id": req.body["personnel_id"], "image_str": req.body["image_str"] },
      consumerId: req.body["personnel_id"]
    }],
    {
      save: "aiResponse", next: true,
      //error check
      resultValidationFunction: (result) => !!result?.has_face ? undefined : { status: 406, message: "No face found", }
    }
  ),
  //save base64 file in assets
  cfs.uploadAvatarMiddleware("aiResponse.face", "personnel_id", { next: true }),
  injectDataMiddleware((body: any) => ({ _id: body["aiResponse"]["_id"], person_id: body["aiResponse"]["personnel_id"], vector: body["aiResponse"]["embedding"] }), { spread: true }),
  //create PersonImage document
  createMiddleware(["person_id", "vector", "hash_id", "_id"], PersonImage)
);

router.post("/search",
  (req: Request, res: Response, next: NextFunction) => {
    req.body.id = randomUuid(24);
    return next()
  },
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaSession,
    (req) => [{
      producerKey: "akbar", consumerKey: "kobra",
      producerInput: ["image_str", "confidence", "id"].reduce((o, k) => Object.assign(o, { [k]: req.body[k] }), {}),
      consumerId: req.body["id"]
    }],
    { save: "redisData", next: true }
  ),
  //error check
  (req: Request, res: Response, next: NextFunction) => req.body["redisData"]?.has_face == true ?
    res.status(406).send({ message: "No face found", }) :
    res.status(200).send({
      success: true,
      data: req.body.redisData ?? "",
    })
);

router.post("/notifpersonnel/guest",
  injectDataMiddleware(async (_body: any) => ({
    code: randomUuid(4, "number").toString() + (new Date()).toLocaleDateString().split("/").map(el => ("0" + el + "0").slice(-3, -1)).join(""),
    guestId: await JobTitle.findOne({ name: 'guest' }).exec().then(job => job?.id)
  }), { spread: true }),
  createMiddleware([
    { guest: (_body) => true },
    { allowed_pass: (body) => allowedPassConvert(body) ?? { "start": 0, "end": 2147483648000 } },
    { first_name: (body) => 'Guest' },
    { last_name: (body) => body["code"] },
    { personnel_code: (body) => body["code"] },
    { job_id: (body) => body["guestId"] }
  ], Personnel, { save: "person", next: true }),
  injectDataMiddleware((body: any) => ({ person_id: body.person?.id }), { spread: true }),
)

router.post("/notifpersonnel/:type?",
  dtoValidationMiddleware(AddPersonImage, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  injectDataMiddleware((body: any) => ({ _id: new mongoose.Types.ObjectId().toHexString() }), { spread: true }),

  snapshotKafka.middlewareWraper(snapshotKafka.kafkaSession,
    (req) => [{
      producerKey: "habil", consumerKey: "ghabil",
      producerInput: ["person_id", "vector", "hash_id", "confidence", "_id"].reduce((o, k) => Object.assign(o, { [k]: req.body[k] }), {}),
      consumerId: 'undefined' // req.body["person_id"]
    }], {
    save: "aiResponse", next: true,
    resultValidationFunction: (result) => !result?.success ? { status: 400, message: result?.message, } : undefined
  }),
  cfs.uploadAvatarMiddleware("image_str", "person_id", { next: true }),
  //create PersonImage document
  createMiddleware(["person_id", "vector", "hash_id", "confidence", "_id"], PersonImage, { next: true, save: "imageDoc" }),
  (req: Request, res: Response, next: NextFunction) => {
    res.status(201).send({
      success: true,
      data: { ...req?.body?.imageDoc?.toJSON(), "image_str": req?.body?.image_str },
    })
  },
)

export default router;