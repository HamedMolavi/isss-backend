import { SnapshotKafka, ImageFileSystem } from "../../tools/kafkaFile.tools";
import { NextFunction, Router, Request, Response } from "express";
import PersonImage from "../../db/mongo/models/personImage";
import { createMiddleware } from "../../db/mongo/create.database";

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

//api for upload image to redis
router.post("/kafka",
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaProduce, { isInReq: true }, "personnel_id", "image_str"));

//route for verified image in redis
router.post("/verify",
  snapshotKafka.middlewareWraper(snapshotKafka.kafkaGet, { save: "redisData", isInReq: true, next: true }, "id"),
  //error check
  (req: Request, res: Response, next: NextFunction) => req.body["redisData"].has_face == true ? next() : res.status(406).send({ message: "No face found", }),
  //save base64 file in assets
  cfs.uploadAvatarMiddleware(["redisData", "face" ], "id", { next: true }),
  //project redisData in req.body
  (req: Request, res: Response, next: NextFunction) => {
    req.body["person_id"] = req.body["redisData"]["personnel_id"];
    req.body["vector"] = req.body["redisData"]["embedding"];
   // req.body["masked_embd"] = req.body["redisData"]["masked_embd"];
    req.body["hash_id"] = req.body["redisData"]["face"];
   // req.body["masked_face_id"] = req.body["redisData"]["masked_face"];
    return next();  
  },
  //create PersonImage document
  createMiddleware(["person_id", "vector", "hash_id"], PersonImage, { next: false })
  );

export default router;
