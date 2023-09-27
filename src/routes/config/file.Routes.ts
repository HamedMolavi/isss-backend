import { FileRedis, FileSystem } from "../../tools/redisFile.tools";
import { NextFunction, Router, Request, Response } from "express";
import fs from "fs";
import axios from "axios";
import path from "path";
import PersonImage from "../../db/mongo/models/personImage";
import { ApiError } from "../../types/classes/error.class";
import { createMiddleware } from "../../db/mongo/create.database";
import { readMiddleware } from "../../db/mongo/read.database";

//create customized redis client
const cfs = new FileSystem();
//create customized redis client
const redis = new FileRedis();
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
router.post("/redis",
  redis.middlewareWraper(redis.redisSave, { isInReq: true }, "personnel_id", "image_str"));

//route for verified image in redis
router.post("/verify", //TODO: clean this further
  redis.middlewareWraper(redis.redisGet, { save: "redisData", isInReq: true, next: true }, "id"),
  //error check
  (req: Request, res: Response, next: NextFunction) => req.body["redisData"].has_face == 1 ? next() : res.status(406).send({ message: "No face found", }),
  //save base64 file in assets
  //TODO : convert BGR to RGB
  cfs.uploadAvatarMiddleware(["redisData", "face"], "id", { next: true }),
  //project redisData in req.body
  (req: Request, res: Response, next: NextFunction) => {
    req.body["personnel_id"] = req.body["redisData"]["personnel_id"];
    req.body["embedding"] = req.body["redisData"]["embedding"];
    req.body["hash_id"] = req.body["id"];
    return next();
  },
  //create PersonImage document
  createMiddleware(["person_id", "vector", "hash_id"], PersonImage, { next: true }),
  //delete json image in redis
  redis.middlewareWraper(redis.redisDelete, { isInReq: true, next: true }, "id"),
  //TODO: this might be refactored so I didn't clean it
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get url AI for send request
      const dbUri: string = process.env["API_AI_REDIS_NAME"] as string;
      //send request to AI api for send id_personnel
      var config = {
        method: "get",
        url: dbUri + "/embed",
        headers: {
          "Content-Type": "application/json",
        },
      };
      await axios(config);

      return res.status(200).send({
        success: true,
        data: {
          message: "Verified the file successfully",
          face: req.body["redisData"].face,
          hash_id: req.body["id"],
        },
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  });

export default router;
