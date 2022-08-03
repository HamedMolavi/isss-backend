import util from "util";
import multer from "multer";
import Guid from "../tools/createGuid";
import redisClient from "./../db/redis";
import { NextFunction, Request, Response } from "express";
import path from "path";
import fs from "fs";
import console from "console";
import { ApiError } from "../error/error.handler";

export interface IFileInRedis {
  id: string;
  full_frame: string;
  face: string;
  embedding: string | number[] | null;
  has_face: number;
  timestamp: Date;
}

type resultType = {
  name: string;
  path: string;
};

export let location: string;
export let fileName: string;

export async function uploadAvatar(
  req: Request,
  res: Response,
  personnel_code: string,
  next: NextFunction
) {
  try {
    //get file from request and change format  to json
    let reqFile = JSON.parse(JSON.stringify(req.files));
    //check file is small than 10MB
    if (Number(reqFile.file.size) > 12419) {
      req.flash("error", "File size is too large");
      return next(new ApiError(400, "File size is too large"));
    }
    //move file to buffer
    let image = Buffer.from(reqFile.file.data, "base64");
    //get path for save file
    let _path = path.join(__dirname, "./../..");
    var dir = _path + "/assets/image";
    //if path not exist, create path
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    var dirPersonnelAvatar = _path + "/assets/image/" + personnel_code;
    if (!fs.existsSync(dirPersonnelAvatar)) {
      fs.mkdirSync(dirPersonnelAvatar);
    }

    //write image in path
    //upload image to server
    await fs.writeFile(dirPersonnelAvatar + "/avatar.png", image, (err) => {
      if (err) {
        return next(new ApiError(500, "internal server error" + err.message));
      }
    });
    const result: resultType = {
      name: "avatar.png",
      path: dirPersonnelAvatar + personnel_code + ".png",
    };
    return result;
  } catch (e: any) {
    return next(new ApiError(500, "internal server error" + e.message));
  }
}

//set file in redis
export async function setFileInRedis(fileBase64: string, Personnel_id: string) {
  try {
    //connet to redis if not connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    //define object for save in redis
    let fileInRedis: IFileInRedis = {
      id: Personnel_id,
      full_frame: fileBase64,
      face: "",
      embedding: "",
      has_face: 0,
      timestamp: new Date(),
    };

    //insert to redis
    await redisClient.set(fileInRedis.id, JSON.stringify(fileInRedis));
    //close redis connection
    redisClient.disconnect();
    //return file id
    return fileInRedis.id.toString();
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}

//get image verified from redis
export async function getImageFromRedis(id: string) {
  try {
    //connet to redis if not connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const result = (await redisClient.get(id)) as any;
    const replaced = result?.replaceAll("'", '"');
    let fileInRedis = JSON.parse(replaced);
    redisClient.disconnect();
    //return file
    return fileInRedis;
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}

//delete jason image in redis
export async function deleteImageInRedis(Personnel_id: string) {
  try {
    //connet to redis if not connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    //delete file from redis
    let result = await redisClient.del(Personnel_id);
    //close redis connection
    redisClient.disconnect();
    //return file
    return result;
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}
