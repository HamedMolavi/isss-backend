import { RedisClientType } from "redis"
import connect from "../db/redis/connect.database";
import path from "path";
import fs from "fs";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../types/classes/error.class";
import { hashJson } from "./hash";
import { read } from "../db/mongo/read.database";
import Personnel from "../db/mongo/models/personnel";
import { IPersonnel } from "../types/interfaces/personnel.interface";
// TODO: clean this shit up.

export class FileRedis {
  redisClient: RedisClientType | undefined
  secret: string
  middlewareWraper: (f: Function, options: { resultPropertyName?: string | undefined, isInReq?: boolean, save?: string | undefined, next?: boolean }, ...args: any[]) => RequestHandler
  json: Function
  hash: (json: { [key: string]: string }) => string
  constructor() {
    this.secret = process.env["SESSION_SECRET"];
    this.hash = (json: { [key: string]: string }) => hashJson(json, this.secret);
    this.middlewareWraper = (f: Function, options: { resultPropertyName?: string | undefined, isInReq?: boolean, save?: string | undefined, next?: boolean }, ...args: any[]) => ((req: Request, res: Response, next: NextFunction) => {
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
      } else if (!!options.next) return next();
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

export class ImageFileSystem {
  baseDir = path.join(__dirname, "./../..");
  imageDir = "./assets/image"
  constructor() {
    this.updateRootDirectories(); // this also updates the baseDir :/ just for your confusion
    this.preCreateDirectories();
  };

  uploadAvatarMiddleware(imagePropertyName: string | Array<string>, idPropertyName: string | Array<string>, options?: { next?: boolean }, resultPropertyName: string = "") {
    /*
    use result property name to identify wether you want to send a customized result to the user.
    */
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        //avatarStr data
        let imageStr: string | Array<any>;
        if (typeof imagePropertyName === "string") imageStr = req.body[imagePropertyName as string] as string
        else {
          imageStr = req.body[(imagePropertyName as Array<string>).shift() as string] as Array<any>;
          //@ts-ignore
          for (const name of imagePropertyName) imageStr = imageStr[name];
        };
        //@ts-ignore
        imageStr = imageStr.split(",")[1];


        //id data
        let id: string | Array<any>;
        if (typeof idPropertyName === "string") id = req.body[idPropertyName as string] as string
        else {
          id = req.body[(idPropertyName as Array<string>).shift() as string] as Array<any>;
          //@ts-ignore
          for (const name of idPropertyName) id = id[name];
        };

        id = String(id);
        //move file to buffer
        let image = Buffer.from(imageStr as string, "base64");
        //get path for save file
        const imageDir = this.makeAndReturnNewDirectoryForUser(id as string);
        const imagePath = path.join(imageDir, "avatar.jpeg");
        //write image in path
        fs.writeFileSync(imagePath, image);

        if (!resultPropertyName) {
          return res.status(201).json({
            success: true,
            data: {
              name: "avatar.jpeg",
              location: imagePath,//TODO: shouldn't it be relative
              message: "Uploaded the file successfully: ",
            }
          });
        } else if (!!options?.next) return next();
        return res.status(201).json({
          success: true,
          data: req.body[resultPropertyName],
        });
      } catch (e: any) {
        return next(new ApiError(500, "Internal Error!"));
      };
    };
  };

  downloadAvatarMiddleware(imagePropertyName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        //get file name from request params
        const fileName = req.params[imagePropertyName];

        //get directory path
        const imagePath = path.join(this.baseDir, fileName, "avatar.jpeg");

        //send image to client
        return res.download(imagePath, fileName, (err) => {
          if (err) {
            req.flash("error", "File not found");
            return next(new ApiError(404, "File not found"));
          }
        });
      } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
      }
    }
  };

  listMiddleware() {
    return (_req: Request, res: Response, next: NextFunction) => {
      try {
        let fileInfos: object[] = [];
        //get directory path
        const directoryPath = path.join(this.baseDir, this.imageDir);
        //get list directory images in directory path
        let imageFolders = fs.readdirSync(directoryPath);
        //loop through list directory images and get file info in each directory
        for (const imageFolder of imageFolders) {
          //get file info in each directory
          let imageFiles = fs.readdirSync(directoryPath + "/" + imageFolder);
          //loop through list file in each directory and get file info
          for (const image of imageFiles) {
            //get file info
            let fileInfo = fs.statSync(directoryPath + "/" + imageFolder + "/" + image);
            //push file info to array
            fileInfos.push({
              name: image,
              size: fileInfo.size,
              path: directoryPath + imageFolder + "/" + image,
            });
          }
        }
        //send response to client
        res.status(200).send(fileInfos);

        // const baseUrl = process.env["BaseUrl"] as string;
      } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
      };
    };
  };

  readFiles(dirname: string): object[] | null {
    //check for exist path
    if (!fs.existsSync(dirname)) return null;
    //read all file in dirname
    let filenames = fs.readdirSync(dirname);
    let response: object[] = [];
    //read file and convert to base 64 and return list base64
    for (const filename of filenames) {
      //read file and convert to base64
      let hash_id = (filename?.split("-")[1]).split(".")[0];
      let content = fs.readFileSync(dirname + filename, "base64");
      let result = {
        hash_id: hash_id,
        faces_base64: content,
      };
      response.push(result); //add to list
    }
    return response;
  };


  //function for delete image in assets
  deleteFiles(fileName: string, dirname: string): Boolean | null {
    //check for exist path
    if (!fs.existsSync(dirname)) return null;
    //read all file in dirname
    let filenames = fs.readdirSync(dirname);
    //delete file if exist
    for (const filename of filenames) if (fileName == filename) fs.unlinkSync(dirname + filename); //delete file if exist
    if (!!fs.existsSync(dirname)) fs.rmSync(dirname, { recursive: true, force: true }); //delete file if exist
    return true;
  };

  deleteDirectoryMiddleware(idPropertyName: string | Array<string>, options?: { force?: boolean, next?: boolean, save?: string, send?: string }) {
    return (req: Request, res: Response, next: NextFunction) => {
      //id data
      let id: string | Array<any>;
      if (typeof idPropertyName === "string") id = req.body[idPropertyName as string] as string
      else {
        id = req.body[(idPropertyName as Array<string>).shift() as string] as Array<any>;
        //@ts-ignore
        for (const name of idPropertyName) id = id[name];
      };
      id = String(id);
      const dirname = path.join(this.baseDir, id);
      //check for exist path
      let result: boolean | null;
      if (!fs.existsSync(dirname)) result = null;
      let filenames = fs.readdirSync(dirname);
      if (filenames.length > 0 && !options?.force) result = false;
      fs.rmSync(dirname, { recursive: true, force: true }); //delete file if exist
      result = true;


      if (!!options?.next) {
        if (options?.save) req.body[options.save] = result
        else req.body["doc"] = result
        return next();
      };
      //send response to client with user
      return res.status(201).json({
        success: true,
        data: !!options?.send ? req.body[options?.send] : result,
      });
    };
  };

  private updateRootDirectories() {
    // PATH CEHCK
    for (const step of this.imageDir.split("/")) {
      this.baseDir = path.join(this.baseDir, step)
      //if path not exist, create path
      if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir);
    };
  };
  private async preCreateDirectories() {
    const personnel: IPersonnel[] = await read(Personnel);
    for (const person of personnel) {
      try {
        fs.mkdirSync(path.join(this.baseDir, this.imageDir, person.id));
      } catch (_) { };
    };
  };
  private makeAndReturnNewDirectoryForUser(id: string) {
    const p = path.join(this.baseDir, id);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p);
      return p;
    };
    return p;
  };
};


