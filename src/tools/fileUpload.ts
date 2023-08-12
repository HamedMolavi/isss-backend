import connect from "../db/redis/connect.database";
import path from "path";
import fs from "fs";
import console from "console";
import { IFileInRedis } from "../types/interfaces/file.interface";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../types/classes/error.class";
import { hashJson } from "./hash";
// TODO: clean this shit up.

export let location: string;
export let fileName: string;

export function uploadAvatar(imagePropertyName: string, idPropertyName: string, resultPropertyName: string = "") {
  /*
  use result property name to identify wether you want to send a customized result to the user.
  */
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    try {
      const imageStr = req.body[imagePropertyName];
      const id = req.body[idPropertyName];
      //move file to buffer
      let image = Buffer.from(imageStr, "base64");
      //get path for save file
      let dirPath = path.join(__dirname, "./../..") + "/assets/image";
      let dirPersonnelAvatar = dirPath + id;
      //if path not exist, create path
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
      //define path for save image
      if (!fs.existsSync(dirPersonnelAvatar)) fs.mkdirSync(dirPersonnelAvatar);
      //write image in path
      fs.writeFileSync(dirPersonnelAvatar + "/avatar.jpeg", image);
      if (!!resultPropertyName) {
        return res.status(201).json({
          success: true,
          data: {
            name: "avatar.jpeg",
            location: dirPersonnelAvatar + id + ".jpeg",
            message: "Uploaded the file successfully: ",
          }
        });
      };
      return res.status(201).json({
        success: true,
        data: req.body[resultPropertyName],
      });
    } catch (e: any) {
      return next(new ApiError(500, "Internal Error!"));
    };
  };
};

//set file in redis
export function setFileInRedis(redisUrl: string, imagePropertyName: string, idPropertyName: string, secret: string, resultPropertyName: string = "") {
  const redisClientParrent = connect(redisUrl);
  const hash = (json: object) => hashJson(json, secret);
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //connet to redis if not connected
      const redisClient = await redisClientParrent;
      //define object for save in redis
      let firstStep = {
        personnel_id: req.body[idPropertyName],
        full_frame: req.body[imagePropertyName],
        face: "",
        embedding: "",
        has_face: 0,
      };
      const id = hash(firstStep);
      let fileInRedis: IFileInRedis = {
        id,
        timestamp: new Date(),
        ...firstStep
      };
      //insert to redis
      await redisClient.set(id, JSON.stringify(fileInRedis));
      //close redis connection
      await redisClient.disconnect();

      if (!!resultPropertyName) {
        return res.status(201).json({
          success: true,
          data: req.body[resultPropertyName]
        });
      };
      return res.status(201).json({
        success: true,
        data: {
          message: "Uploaded the file successfully",
          id
        },
      });
    } catch (error: any) {
      req.flash("error", "File not upload");
      return next(new ApiError(400, "File not upload"));
    };
  };
};

//get image verified from redis
export async function getImageFromRedis(id: string) {
  try {
    //connet to redis if not connected
    if (!(await redisClient).isOpen) {
      await (await redisClient).connect();
    }
    const result = (await (await redisClient).get(id)) as any;
    const replaced = result?.replaceAll("'", '"');
    let fileInRedis = JSON.parse(replaced);
    (await redisClient).disconnect();
    //return file
    return fileInRedis;
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}

//delete jason image in redis
export async function deleteImageInRedis(id: string) {
  try {
    //connet to redis if not connected
    if (!(await redisClient).isOpen) {
      await (await redisClient).connect();
    }
    //delete file from redis
    let result = await (await redisClient).del(id);
    //close redis connection
    (await redisClient).disconnect();
    //return file
    return result;
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}
//function for read all image in assets and convert to base64 and return list base64
export async function readFiles(dirname: string): Promise<object[] | null> {
  //check for exist path
  if (!fs.existsSync(dirname)) {
    return null;
  }
  //read all file in dirname
  let filenames = await fs.promises.readdir(dirname);
  let response: object[] = [];
  //read file and convert to base 64 and return list base64
  for (let i = 0; i < filenames.length; i++) {
    //read file and convert to base64
    let hash_id = (filenames[i]?.split("-")[1]).split(".")[0];
    let content = await fs.promises.readFile(dirname + filenames[i], "base64");
    let result = {
      hash_id: hash_id,
      faces_base64: content,
    };
    response.push(result); //add to list
  }
  return response;
}
//function for delete image in assets
export async function deleteFiles(fileName: string, dirname: string): Promise<Boolean | null> {
  //check for exist path
  if (!fs.existsSync(dirname)) {
    return null;
  }
  let result: Boolean = false;
  //read all file in dirname
  let filenames = await fs.promises.readdir(dirname);
  //delete file if exist
  for (let i = 0; i < filenames.length; i++) {
    if (fileName == filenames[i]) {
      await fs.promises.unlink(dirname + filenames[i]); //delete file if exist
      result = true;
    }
  }
  await deleteDirectory(dirname, false);
  return result;
}

export async function deleteDirectory(dirname: string, force: boolean): Promise<Boolean | null> {
  //check for exist path
  if (!fs.existsSync(dirname)) {
    return null;
  }
  let result: boolean = false;
  let filenames = await fs.promises.readdir(dirname);
  if (filenames.length > 0 && !force) {
    return false;
  }
  await fs.promises.rm(dirname, { recursive: true, force: true }); //delete file if exist
  result = true;
  return result;
}
