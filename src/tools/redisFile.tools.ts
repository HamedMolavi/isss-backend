import { RedisClientType } from "redis"
import connect from "../db/redis/connect.database";
import path from "path";
import fs from "fs";
import { IFileInRedis } from "../types/interfaces/file.interface";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../types/classes/error.class";
import { hashJson } from "./hash";
// TODO: clean this shit up.

export class FileRedis {
  redisClient: RedisClientType | undefined
  secret: string
  middlewareWraper: (f: Function, options: { resultPropertyName?: string | undefined, isInReq?: boolean, save?: string | undefined }, ...args: any[]) => RequestHandler
  json: Function
  hash: (json: { [key: string]: string }) => string
  constructor() {
    this.secret = process.env["SESSION_SECRET"];
    this.hash = (json: { [key: string]: string }) => hashJson(json, this.secret);
    this.middlewareWraper = (f: Function, options: { resultPropertyName?: string | undefined, isInReq?: boolean, save?: string | undefined }, ...args: any[]) => ((req: Request, res: Response) => {
      /*
      takes an function to wrap it with RequestHandler.
      Inside it will call the function with the given args.
      If isInReq is true, you can give property names of req.body in args.
      If resultPropertyName is not undefiend, the result sent to the user will be req.body[resultPropertyName]
      */
      const inputs = options.isInReq ? args : Object.entries(req.body).filter(el => args.includes(el[0])).map(el => el[1])
      const result = f(...inputs);
      if (!!options.save) return req.body[options.save] = result;
      if (!!options.resultPropertyName) {
        return res.status(201).json({
          success: true,
          data: req.body[options.resultPropertyName as string],
        });
      };
      return res.status(201).json({
        success: true,
        data: result,
      });
    });
    this.json = function recursive(o: { [key: string]: string } | undefined = undefined, kwargs: Array<[string, string]> | undefined = undefined) {
      if (!o) {
        let json: { [key: string]: string } = {};
        if (!!kwargs)
          for (const kwarg of kwargs) json[kwarg[0]] = kwarg[1];
        else
          json = { "key": "value" } //TODO: default version of this
        recursive(json, undefined);
      } else {
        const id = this.hash(o);
        return { id, ...o };
      };
    };
    connect(process.env["REDIS_URL"])
      .then(client => this.redisClient = client);
  };

  async redisSave(personnel_id: string, full_frame: string) {
    //define object for save in redis
    let fileInRedis = this.json({
      personnel_id,
      full_frame,
      face: "",//TODO: why empty?
      embedding: "",
      has_face: "0",
      timestamp: new Date(new Date().toLocaleString() + "+0").toISOString(),
    });
    //insert to redis
    await this.redisClient?.set(fileInRedis?.id as string, JSON.stringify(fileInRedis));
    //close redis connection
    return {
      message: "Uploaded the file successfully",
      id: fileInRedis?.id
    };
  };

  async redisGet(id: string) {
    const result = await this.redisClient?.get(id) as string;
    const replaced = result?.replace("'", '"');
    const json = JSON.parse(replaced);
    //return file
    return json;
  };

  async redisDelete(id: string) {
    let result = await this.redisClient?.del(id);
    return {
      message: "Deleted the file successfully",
      data: result
    };
  };

};




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
      let dirPath = path.join(__dirname, "./../..") + "/assets/image/";
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


