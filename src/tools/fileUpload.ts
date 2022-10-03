import util from "util";
import multer from "multer";
import Guid from "../tools/createGuid";
import redisClient from "./../db/redis";
import { NextFunction, Request, Response } from "express";
import path, { basename } from "path";
import fs from "fs";
import console from "console";
import { ApiError } from "../error/error.handler";

export interface IFileInRedis {
  id: string;
  full_frame: string;
  personnel_id: string;
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

export async function uploadAvatar(image_str: string, personnel_code: string) {
  try {
    //move file to buffer
    let image = Buffer.from(image_str, "base64");
    //get path for save file
    let _path = path.join(__dirname, "./../..");
    var dir = _path + "/assets/image";

    var dirPersonnelAvatar = _path + "/assets/image/" + personnel_code;

    //if path not exist, create path
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    //define path for save image
    if (!fs.existsSync(dirPersonnelAvatar)) {
      fs.mkdirSync(dirPersonnelAvatar);
    }

    //write image in path
    await fs.writeFile(dirPersonnelAvatar + "avatar.jpeg", image, (err) => {
      if (err) {
        return null;
      }
    });

    const result: resultType = {
      name: "avatar.jpeg",
      path: dirPersonnelAvatar + personnel_code + ".jpeg",
    };
    return result;
  } catch (e: any) {
    return null;
  }
}

//set file in redis
export async function setFileInRedis(fileBase64: string, id: string, Personnel_id: string) {
  try {
    //connet to redis if not connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    //define object for save in redis
    let fileInRedis: IFileInRedis = {
      id: id,
      personnel_id: Personnel_id,
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
export async function deleteImageInRedis(id: string) {
  try {
    //connet to redis if not connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    //delete file from redis
    let result = await redisClient.del(id);
    //close redis connection
    redisClient.disconnect();
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
    let hash_id = (filenames[i]?.split("-")[1]).split(".")[0]
    let content = await fs.promises.readFile(dirname + filenames[i], "base64");
    let result = {
      hash_id : hash_id,
      faces_base64 : content
    }
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
      await fs.promises.unlink(dirname + filenames[i]);//delete file if exist
      result = true;
    }
  }
  return result;
}
