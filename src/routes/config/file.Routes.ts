import {  FileRedis, FileSystem } from "../../tools/redisFile.tools";
import { NextFunction, Router, Request, Response } from "express";
import fs from "fs";
import axios from "axios";
import path from "path";
import PersonImage from "../../db/mongo/models/personImage";
import { ApiError } from "../../types/classes/error.class";

//create customized redis client
const cfs = new FileSystem();
//create customized redis client
const redis = new FileRedis();
//create router for add to server
const router: Router = Router();

//create api for upload image
router.post(
  "/upload",
  cfs.uploadAvatar("image_str", "perssonel_id"),
);

//create api for download image
router.get("/download/:fileName", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get file name from request params
    const fileName = req.params.fileName;

    //get directory path
    const directoryPath = path.join(__dirname, "./../../../assets/image/") + fileName + "/";

    //send image to client
    res.download(directoryPath + "avatar.jpeg", fileName, (err) => {
      if (err) {
        req.flash("error", "File not found");
        return next(new ApiError(404, "File not found"));
      }
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//create api for get list file upload
router.get("/list", async function (req: Request, res: Response, next: NextFunction) {
  try {
    let fileInfos: object[] = [];
    //get directory path
    const directoryPath = path.join(__dirname, "./../../../assets/image/");
    //get list directory images in directory path
    let imageFolders = await fs.promises.readdir(directoryPath);
    //loop through list directory images and get file info in each directory
    for (let i = 0; i < imageFolders.length; i++) {
      //get file info in each directory
      let imageFiles = await fs.promises.readdir(directoryPath + "/" + imageFolders[i]);
      //loop through list file in each directory and get file info
      for (let j = 0; j < imageFiles.length; j++) {
        //get file info
        let fileInfo = await fs.promises.stat(directoryPath + "/" + imageFolders[i] + "/" + imageFiles[j]);
        //push file info to array
        fileInfos.push({
          name: imageFiles[j],
          size: fileInfo.size,
          path: directoryPath + imageFolders[i] + "/" + imageFiles[j],
        });
      }
    }
    //send response to client
    res.status(200).send(fileInfos);

    // const baseUrl = process.env["BaseUrl"] as string;
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//api for upload image to redis
router.post("/redis",
  redis.middlewareWraper(redis.redisSave, { isInReq: true }, "personnel_id", "image_str"));

//route for verified image in redis
router.post("/verify",
  redis.middlewareWraper(redis.redisGet, { save: "redisData", isInReq: true }, "id"),
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      let redisData: any = req.body["redisData"];
      //convert base64 to file
      let image = Buffer.from(redisData.face, "base64");
      if (redisData.has_face === 1) {
        let guid: string = req.body["id"];
        //create name for image
        let fileName: string = guid + ".jpeg";
        //TODO : convert BGR to RGB
        //define path for save image
        let pathSave = path.join(__dirname, `./../../../assets/image/${redisData.personnel_id}`);
        if (!fs.existsSync(pathSave)) fs.mkdirSync(pathSave);
        pathSave = path.join(__dirname, `./../../../assets/image/${redisData.personnel_id}/${redisData.personnel_id}`);
        //write image in path
        fs.writeFileSync(pathSave + fileName, image);
        let embedding = redisData.embedding;
        //create new personimage
        let personImage = new PersonImage();
        personImage.person_id = redisData.personnel_id;
        personImage.vector = embedding;
        personImage.hash_id = guid;
        //  save personimage in database
        await personImage.save();
        //  delete jason image in redis
        await redis.redisDelete(req.body["id"]);
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
            face: redisData.face,
            hash_id: guid,
          },
        });
      } else if (Number(redisData.has_face) === 0) {
        req.flash("error", "No face found");
        //send response to client for not face recognition
        res.status(406).send({
          message: "No face found",
        });
      }
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  });

export default router;
