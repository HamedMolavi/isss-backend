import { SnapshotKafka, ImageFileSystem } from "../../tools/kafkaFile.tools";
import { NextFunction, Router, Request, Response } from "express";
import PersonImage from "../../db/mongo/models/personImage";
import { createMiddleware } from "../../db/mongo/create.database";
import { randomUuid, unpickle } from "../../tools/utils.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import mongoose from "mongoose";
import { AddBatchPersonnel, AddClient, AddHostilePerson, AddPersonImage } from "../../validation/dto/files.dto";
import { injectDataMiddleware } from "../../tools/request.tools";
import Personnel from "../../db/mongo/models/personnel";
import { allowedPassConvert } from "../../tools/time.tools";
import JobTitle from "../../db/mongo/models/jobTitle";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { ApiError } from "../../types/classes/error.class";
import { hashString } from "../../tools/hash";
import { IPersonnel } from "../../types/interfaces/personnel.interface";
import { Kafka, logLevel } from "kafkajs";
import { ensureDirSync, moveSync } from "fs-extra";
import Product from "../../db/mongo/models/product";
import Camera from "../../db/mongo/models/camera";
import { ISection } from "../../types/interfaces/section.interface";

const secret = process.env["SESSION_SECRET"];
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

router.post("/batch",
  dtoValidationMiddleware(AddBatchPersonnel, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaSession,
    (req) => {
      req.body._id = randomUuid(24); return [{
        producerKey: "dara", consumerKey: "sara",
        producerInput: { "path": req.body["path"], _id: req.body['_id'] },
        consumerId: req.body["_id"],
        timeout: Math.max(readdirSync(path.join(__dirname, '../../../face_DB', req.body['path'])).length * 50, 10000)
      }]
    },
    {
      save: "aiRes", next: true,
      resultValidationFunction: (result) => !!result?.success_dir ? undefined : { status: 500, message: "Not Successful (no success dir in response)!", }
    }
  ),
  // (req, res, next)=>{
  //   req.body['aiRes'] = {
  //     "success_dir": "DB_success_20240910_155141",
  //     "successful": [
  //       "DB_success_20240910_155141/9820574/9820574.jpg", "DB_success_20240910_155141/9319903/9319903.jpg", "DB_success_20240910_155141/9616734/9616734.jpg", "DB_success_20240910_155141/9942413/9942413.jpg", "DB_success_20240910_155141/9540153/9540153.jpg", "DB_success_20240910_155141/40110364/40110364.jpg" ],
  //     "failed": [],
  //     "_id": "7_4abe-82ff-31eabdc06e3e"
  //   }
  //   next();
  // },
  async (req, _res, next) => {
    const producer = new Kafka({ logLevel: logLevel.ERROR, brokers: process.env["KAFKA_BOOTSTRAP"].split(","), }).producer();
    await producer.connect();
    await producer.send({
      topic: process.env["SIGNAL_TOPIC"],
      messages: [
        {
          key: "connect",
          value: JSON.stringify({ "signal": "shutdown", "origin": "back", "sender": "back", "timeout": Math.max(readdirSync(path.join(__dirname, '../../../face_DB', req.body['aiRes']['success_dir'])).length * 30, 10 * 60 * 1000) }),
        },
      ],
    })
    await producer.disconnect();
    return next();
  },
  // //save base64 file in assets
  // cfs.uploadAvatarMiddleware("aiResponse.face", "personnel_id", { next: true }),
  // injectDataMiddleware((body: any) => ({ _id: body["aiResponse"]["_id"], person_id: body["aiResponse"]["personnel_id"], vector: body["aiResponse"]["embedding"] }), { spread: true }),
  // //create PersonImage document
  // createMiddleware(["person_id", "vector", "hash_id", "_id"], PersonImage)
  async (req, res, next) => {
    const data: any = req.body['aiRes'];
    const assetsDir = path.join(__dirname, '../../../assets/image');
    const success_dir = path.join(__dirname, '../../../face_DB', data['success_dir']);
    const user_dir = path.join(__dirname, '../../../face_DB', req.body['path']);
    const picklePath = path.join(success_dir, 'embeddings.pkl');
    if (!data || !data['success_dir'] || !existsSync(picklePath)) return next(new ApiError(500, "Internal error!"));
    const imageData: { [key: string]: Array<number> } = await unpickle(picklePath) as any;
    let successful_count = 0;
    let failed_count = data['failed'].length;
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    for (const personnelCode_imageName in imageData) {
      const personnel_code = personnelCode_imageName.split("_")[0];
      let newPerson = false;
      let person = await Personnel.findOne({ personnel_code }).exec();
      if (!person) {
        person = new Personnel({ personnel_code, first_name: personnel_code, last_name: personnel_code });
        await person.save();
        newPerson = true;
      }
      //////////////////////////////////////
      try {
        if (Object.prototype.hasOwnProperty.call(imageData, personnelCode_imageName)) {
          const imagesDirPath = path.join(success_dir, personnel_code);
          if (!existsSync(imagesDirPath)) { failed_count += 1; continue };
          const personnel_id = person.id;
          const imagePaths = readdirSync(imagesDirPath).filter(file => (/\.(png|jpg|jpeg|bmp)$/i).test(file.toLowerCase())).map((file) => path.join(imagesDirPath, file));
          if (!imagePaths.length) console.log("wrong ext", readdirSync(imagesDirPath))
          //////////////////////////////////////
          for (const imagePath of imagePaths) {
            const image64 = readFileSync(imagePath).toString('base64');
            const hash_id = hashString(image64, secret);
            const existingPersonImage = await PersonImage.findOne({ hash_id }).exec();
            //////////////////////////////////////
            if (!!existingPersonImage) {
              const pervPerson = await Personnel.findById(existingPersonImage.person_id).exec();
              if (person.id === pervPerson?.id) {
                console.log(`Image already added for personnel ${person.id}/${personnel_code}: ${imagePath}`)
              } else if (!!pervPerson) {
                const pervPersonnel_code = pervPerson?.personnel_code;
                console.log(`Image ${imagePath} exists for ${pervPersonnel_code} and can't be added to ${personnel_code}`);
                let pp: string | undefined = data['successful'].find((p: string) => p.includes(personnelCode_imageName.replace('_', '/')));
                if (typeof pp === 'string') {
                  ensureDirSync(path.join(user_dir, personnel_code))
                  const exactImagePath = path.join(__dirname, '../../../face_DB', pp);
                  moveSync(exactImagePath, path.join(user_dir, `${personnel_code}/${path.basename(exactImagePath)}`), { overwrite: true })
                  if (!readdirSync(path.dirname(exactImagePath)).length) rmdirSync(path.dirname(exactImagePath));
                }
                let pp2: string | undefined = data['successful'].find((p: string) => p.includes(pervPersonnel_code));
                if (!!pp2) {
                  ensureDirSync(path.join(user_dir, pervPersonnel_code))
                  const exactImagePath = path.join(__dirname, '../../../face_DB', pp2);
                  moveSync(exactImagePath, path.join(user_dir, `${pervPersonnel_code}/${path.basename(exactImagePath)}`), { overwrite: true })
                  if (!readdirSync(path.dirname(exactImagePath)).length) rmdirSync(path.dirname(exactImagePath));
                } else {
                  try {
                    ensureDirSync(path.join(user_dir, pervPersonnel_code));
                    moveSync(path.join(assetsDir, pervPerson.id, `${pervPerson.id}-${existingPersonImage.hash_id}.jpeg`), path.join(user_dir, `${pervPersonnel_code}/${pervPersonnel_code}.jpg`), { overwrite: true })
                  } catch (error) { }
                }
                failed_count += 2;
                successful_count -= data['successful'].filter((p: string) => p.includes(pervPersonnel_code)).length;
                await pervPerson?.delete();
                await person.delete();
                await existingPersonImage.delete();
              }
              continue;
            }
            //////////////////////////////////////
            const vector = imageData[personnelCode_imageName];
            const personnelImageDir = path.join(assetsDir, personnel_id);
            const name = `${personnel_id}-${hash_id}`;
            mkdirSync(personnelImageDir, { recursive: true });
            writeFileSync(path.join(personnelImageDir, `${name}.jpeg`), Buffer.from(image64, "base64"));
            const personImage = new PersonImage({ _id: new mongoose.Types.ObjectId().toHexString(), person_id: person._id, hash_id, vector });
            await personImage.save();
            successful_count += 1;
          }
        }
      } catch (error) {
        console.log(error)
        let pp: string | undefined = data['successful'].find((p: string) => p.includes(personnelCode_imageName.replace('_', '/')));
        //  = data['successful'].filter((p: string) => {
        //   if (!) return true;
        //   pp = p;
        //   return false;
        // });
        // data['failed']?.push(pp);
        if (typeof pp === 'string') {
          ensureDirSync(path.join(user_dir, personnel_code))
          moveSync(path.join(__dirname, '../../../face_DB', pp), path.join(user_dir, personnel_code), { overwrite: true })
        }
        if (newPerson) {
          await person.delete();
        }
        failed_count += 1;
      }
    }
    // data['successful_count'] = data['successful'].length;
    data['successful_count'] = successful_count;
    data['successful'] = undefined;
    // data['failed_count'] = data['failed'].length;
    data['failed_count'] = failed_count;
    data['failed'] = undefined;
    res.send({
      success: true,
      data
    })
    // return next();
    const producer = new Kafka({
      logLevel: logLevel.ERROR,
      brokers: process.env["KAFKA_BOOTSTRAP"].split(","),
    }).producer();
    await producer.connect();
    await producer.send({
      topic: process.env["DATA_TOPIC"] ?? 'data',
      messages: [
        {
          key: "sio",
          value: JSON.stringify({ type: 'batch', success: true, data }),
        },
      ],
    })
    await (new Promise((resolve, _rej) => {
      producer.send({
        topic: process.env["SIGNAL_TOPIC"],
        messages: [
          {
            key: "connect",
            value: JSON.stringify({ signal: "turnon", origin: "back", sender: "back" }),
          },
        ],
      })
      setTimeout(() => resolve(true), 5000);
    }))
    await producer.send({
      topic: process.env["SIGNAL_TOPIC"],
      messages: [
        {
          key: "connect",
          value: JSON.stringify({ signal: "restart", origin: "back", sender: "back" }),
        },
      ],
    })
    await producer.disconnect();
    return
  },
)




router.post("/hostile",
  dtoValidationMiddleware(AddHostilePerson, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  injectDataMiddleware((body: any) => ({ code: randomUuid(4, "number").toString() + (new Date()).toLocaleDateString().split("/").map(el => ("0" + el + "0").slice(-3, -1)).join("") }), { spread: true }),
  createMiddleware([
    { tracked: (body) => !!body["tracked"] },
    { alert: (body) => !!body["alert"] },
    { first_name: (body) => 'Hostile' },
    { last_name: (body) => body["code"] },
    { person_type: (_body) => 'hostile' },
    { personnel_code: (body) => body["code"] }
  ], Personnel, { save: "person", next: true }),

  async (req, res, next) => {
    let data: any[] = [];
    let result: any[] = [];
    const person = req.body["person"];
    if (!Array.isArray(req.body["image_str"]))
      if (typeof req.body["image_str"] === 'string') req.body["image_str"] = [req.body["image_str"]];
      else next(new ApiError(400, "Bad request!"));
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
    { person_type: (_body) => 'guest' },
    { personnel_code: (body) => body["code"] },
    { job_id: (body) => body["guestId"] }
  ], Personnel, { save: "person", next: true }),
  injectDataMiddleware((body: any) => ({ person_id: body.person?.id }), { spread: true }),
)

router.post("/notifpersonnel/client",
  dtoValidationMiddleware(AddClient, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  createMiddleware([
    { first_name: (body) => body["first_name"] },
    { last_name: (body) => body["last_name"] },
    { person_type: (body) => body['client_type'] },
    { phone_number: (body) => body['phone_number'] },
    { alert: (_) => false },
    { personnel_code: (_) => randomUuid(4, "number").toString() + (new Date()).toLocaleDateString().split("/").map(el => ("0" + el + "0").slice(-3, -1)).join("") },
    { job_id: async (_) => await JobTitle.findOne({ name: 'client' }).exec().then(job => job?.id) },
    { camera_whitelist: async (_) => await Camera.find({}).exec().then(cameras => cameras.map(cam => cam._id)) },
  ], Personnel, { save: "person", next: true }),
  injectDataMiddleware((body: any) => ({ person_id: body.person?.id }), { spread: true }),
  createMiddleware([
    { name: (body) => body['product_name'] ?? 'product' },
    { images: (body) => body['product_images'] },
    { product_code: (body) => body['person']['personnel_code'] },
    { person_id: (body) => body['person']['_id'] },
    "face_log_id",
    { features: (body) => [{ name: "product_weight", value: body['product_weight'] }] }
  ], Product, { next: true, save: "product", }),
  injectDataMiddleware((body: any) => ({
    "first_name": body["first_name"],
    "last_name": body["last_name"],
    "client_type": body["client_type"],
    "phone_number": body["phone_number"],
    "product_images": body["product_images"],
    "product_name": body["product_name"],
    "product_weight": body["product_weight"],
  }), { injData: "sendings" }),

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
      data: {
        ...req?.body?.imageDoc?.toJSON(),
        "image_str": req?.body?.image_str,
        ...req.body['sendings']
      },
    })
  },
)

export default router;