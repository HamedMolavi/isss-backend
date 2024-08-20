import path from "path";
import fs from "fs";
import {
  Consumer,
  Kafka,
  Producer,
  logLevel as l,
} from "kafkajs";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../types/classes/error.class";
import { hashString } from "./hash";
import { read } from "../db/mongo/read.database";
import Personnel from "../db/mongo/models/personnel";
import { IPersonnel } from "../types/interfaces/personnel.interface";
import { getPropertyFromBody } from "./utils.tools";
import { generateRandomString } from "./util.tools";
import mongoose from "mongoose";

const brokers = process.env["KAFKA_BOOTSTRAP"].split(",");
const logLevel = l.ERROR;
const consumerDataPerpareFunction = {
  asghar: (msg: any) => ({
    [msg["personnel_id"]]: {
      timestamp: new Date().toISOString(),
      _id: msg["_id"],
      personnel_id: msg["personnel_id"],
      personnel_name: msg["personnel_name"] as string | undefined,
      face: msg["cropped_face"] as string | undefined,
      masked_face: msg["masked_face"] as string | undefined,
      masked_embd: msg["masked_embd"] as number[] | undefined,
      embedding: msg["cropped_embd"] as number[] | undefined,
      has_face: msg["has_face"] as boolean,
      multi_face: msg["multi_face"] as boolean | undefined,
    }
  }),
  kobra: (msg: any) => ({
    [msg["id"]]: {
      timestamp: new Date().toISOString(),
      data: msg["matches"]?.map((elem: any) => {
        return elem.id;
      })
    }
  }),
  ghabil: (msg: any) => ({
    [msg["person_id"]]: {
      timestamp: new Date().toISOString(),
      _id: msg["_id"] as string | null,
      status_code: msg["status_code"] as number | null,
      success: msg["success"] as boolean | null,
      message: msg["message"] as string | null,
    }
  }),
}

const producerDataPerpareFunction = {
  soghra: async (inputs: any) => {
    const full_frame: string = inputs.image_str ?? "";
    const personnel = await Personnel.findById(inputs.personnel_id).exec();
    const timestamp = new Date(new Date().toLocaleString() + "+0").toISOString();
    const name = personnel ? `${personnel.first_name} ${personnel.last_name}` : '';
    const frame = full_frame?.split(',')[1] ?? full_frame;
    return {
      _id: new mongoose.Types.ObjectId().toHexString(),
      personnel_id: personnel?.id ?? '',
      personnel_name: name,
      full_frame: frame ?? "",
      face: "",
      embedding: "",
      has_face: "0",
      confidence: inputs.confidence ?? "0",
      timestamp: timestamp,
    };
  },

  akbar: (inputs: any) => {
    const full_frame: string = inputs.image_str ?? "";
    const timestamp = new Date(new Date().toLocaleString() + "+0").toISOString();
    const frame = full_frame?.split(',')[1] ?? full_frame;
    return {
      personnel_id: '',
      personnel_name: '',
      full_frame: frame ?? "",
      face: "",
      embedding: "",
      has_face: "0",
      confidence: inputs.confidence ?? "0",
      timestamp: timestamp,
      id: inputs.id
    };
  },

  habil: (inputs: any) => {
    const timestamp = new Date(new Date().toLocaleString() + "+0").toISOString();
    // const frame = full_frame?.split(',')[1] ?? full_frame;
    return {
      _id: inputs._id ?? "",
      personnel_id: inputs.person_id ?? "",
      hash_id: inputs.hash_id ?? "",
      vector: inputs.vector ?? [],
      confidence: inputs.confidence ?? "0",
      timestamp: timestamp,
    };
  },
};


export class SnapshotKafka {
  ongoings: string[];

  constructor() {
    this.ongoings = [];
  }

  async kafkaSession(allInOneInput: { consumerKey: string, producerKey: string, producerInput: any, consumerId: string }) {
    const { consumerKey, producerKey, producerInput, consumerId } = allInOneInput;
    if (!!this.ongoings.some(el => el === producerInput?.personnel_id || el === producerInput?.person_id)) throw Error(`This person has ongoing image process!`);
    const handler = producerDataPerpareFunction[producerKey as keyof typeof producerDataPerpareFunction];
    if (!handler) return undefined;
    const sentData = await handler(producerInput);
    const msg = Buffer.from(JSON.stringify(sentData), "utf8");
    let result: any = { error: "No data found for the given ID" };
    const producer = new Kafka({ logLevel, brokers }).producer();
    await producer.connect();
    const kafka = new Kafka({ clientId: 'backend', brokers });
    const consumer = kafka.consumer({ groupId: generateRandomString(10) });
    await consumer.connect();
    await consumer.subscribe({ topic: 'snapshot', fromBeginning: false });
    if (!!producerInput?.personnel_id) this.ongoings.push(producerInput?.personnel_id);
    // if (!!producerInput?.person_id) this.ongoings.push(producerInput?.person_id);
    /////////////////////////////////////////////////////////////////////////////////////////////
    return new Promise(async (resolve, _reject) => {
      const retHandler = () => {
        clearTimeout(timer);
        this.ongoings = this.ongoings.filter(el => !!el && el !== consumerId);
        consumer.stop();
        return resolve(result);
      }
      const timer = setTimeout(retHandler, 30000);
      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            const msg = JSON.parse(message.value?.toString("utf8") as string);
            const key = message.key?.toString();
            if (key !== consumerKey) return;
            const handler = consumerDataPerpareFunction[consumerKey as keyof typeof consumerDataPerpareFunction];
            const body = handler(msg);
            result = Object.values(body)[0];
            const _id = Object.keys(body)[0];
            if (_id !== consumerId) return;
            return retHandler();
          } catch (error) {
            return retHandler();
          }
        }
      })
      await producer.send({ topic: "snapshot", messages: [{ key: producerKey, value: msg }] })
        .then(_ => producer.disconnect());
    })

  }

  middlewareWraper(f: Function, inputs: (req: Request) => any[],
    options: {
      resultPropertyName?: string | undefined;
      resultValidationFunction?: (result: any) => undefined | { status: number; message: string } | Promise<undefined | { status: number; message: string }>;
      save?: string | undefined;
      next?: boolean;
    }
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let result: any
      try {
        result = await f.call(this, ...inputs(req));
      } catch (e: any) {
        return next(new ApiError(500, e.toString()));
      };

      if (!!options.save) req.body[options.save] = result;
      if (!!options?.resultValidationFunction?.call) {
        let errMsg = await options.resultValidationFunction.call(this, result);
        if (!!errMsg) return next(new ApiError(errMsg.status, errMsg.message));
      }
      if (!!options.resultPropertyName) {
        return res.status(201).json({
          success: true,
          data: req.body[options.resultPropertyName as string],
        });
      }
      if (!!options.next) return next();
      return res.status(201).json({
        success: true,
        data: result,
      });
    };
  }

}


export class ImageFileSystem {
  baseDir = path.join(__dirname, "./../..");
  imageDir = "./assets/image";
  hash: (json: string) => string;
  secret = process.env["SESSION_SECRET"];

  constructor() {
    this.updateRootDirectories(); // this also updates the baseDir :/ just for your confusion
    this.preCreateDirectories();
    this.hash = (imgBase64: string) => hashString(imgBase64, this.secret);
  }

  uploadAvatar = (id: string, imageStr: string, options?: { fileName?: string }) => {
    let imagePath: string = "";
    let name = "";
    let hash = "";
    imageStr = imageStr.split(",").length >= 2 ? imageStr.split(",")[1] : imageStr;
    if (!!options?.fileName) name = options.fileName;
    else {
      hash = this.hash(imageStr);
      name = `${id}-${hash}`;
    }
    //convert file to buffer
    let image = Buffer.from(imageStr as string, "base64");
    //get path for save file
    const imageDir = this.makeAndReturnNewDirectoryForUser(id as string);
    imagePath = path.join(imageDir, `${name}.jpeg`);
    //write image in path
    fs.writeFileSync(imagePath, image);
    return {
      imageStr, name, imagePath, hash
    }
  };

  uploadAvatarMiddleware = (
    imagePropertyName: string,
    idPropertyName: string,
    options?: { next?: boolean; fileName?: string, resultPropertyName?: string },
  ) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        let imagePath: string = "";
        let name = "";
        // person id data
        let id = String(getPropertyFromBody(req, idPropertyName.split(".")) ?? "");
        let imageStr = String(getPropertyFromBody(req, imagePropertyName.split(".")) ?? "");
        let check = !!imageStr && !!id;
        if (check) {
          imageStr = imageStr.split(",").length >= 2 ? imageStr.split(",")[1] : imageStr;
          if (!!options?.fileName) name = options.fileName;
          else {
            const hash = this.hash(imageStr);
            name = `${id}-${hash}`;
            // req.body["redisData"][typeof imagePropertyName === "string" ? imagePropertyName : imagePropertyName[imagePropertyName.length - 1]] = hash;
            req.body["hash_id"] = hash;
          }
          let image = Buffer.from(imageStr as string, "base64");
          //get path for save file
          const imageDir = this.makeAndReturnNewDirectoryForUser(id as string);
          imagePath = path.join(imageDir, `${name}.jpeg`);
          //write image in path
          fs.writeFileSync(imagePath, image);
        };
        if (!!options?.next) return next();
        if (!options?.resultPropertyName) {
          return res.status(check ? 201 : 404).json({
            success: check,
            data: check ? {
              name: `${name}.jpeg`,
              location: imagePath,
              message: "Uploaded the file successfully!"
            } : { message: "Uploaded the file failed!" },
          });
        } else {
          return res.status(201).json({
            success: true,
            data: req.body[options.resultPropertyName]
          });
        }
      } catch (e: any) {
        return next(new ApiError(500, "Internal Error!"));
      }
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
    };
  }

  listMiddleware() {
    return async (_req: Request, res: Response, next: NextFunction) => {
      try {
        let fileInfos: object[] = [];
        //get directory path
        const directoryPath = path.join(this.baseDir, this.imageDir);
        //get list directory images in directory path
        let imageFolders = fs.readdirSync(directoryPath);
        //loop through list directory images and get file info in each directory
        for (const imageFolder of imageFolders) {
          //get file info in each directory
          let imageFiles = fs.readdirSync(
            path.join(directoryPath, imageFolder)
          );
          //loop through list file in each directory and get file info
          for (const image of imageFiles) {
            //get file info
            let fileInfo = fs.statSync(
              path.join(directoryPath, imageFolder, image)
            );
            //push file info to array
            fileInfos.push({
              name: image,
              size: fileInfo.size,
              path: path.join(directoryPath, imageFolder, image),
            });
          }
        }
        //send response to client
        res.status(200).send(fileInfos);

        // const baseUrl = process.env["BaseUrl"] as string;
      } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
      }
    };
  }

  readFiles(dirname: string, files: Array<string>): { "hash_id": string, "faces_base64": string, [key: string]: any }[] | null {
    //check for existance
    files = files.filter((file) => fs.existsSync(path.join(dirname, file)));
    let response: any = [];
    //read file and convert to base 64 and return list base64
    for (const file of files) {
      //read file and convert to base64
      let hash_id = file.split("-")[1].split(".")[0];
      let content = fs.readFileSync(path.join(dirname, file), "base64");
      let result = {
        hash_id: hash_id,
        faces_base64: content,
      };
      response.push(result); //add to list
    }
    return response;
  }

  //function for delete image in assets
  deleteFiles(dirname: string, files: Array<string>): Boolean | null {
    try {
      //check for existance
      files = files.filter((file) => fs.existsSync(path.join(dirname, file)));
      //delete file if exist
      for (const file of files) fs.unlinkSync(path.join(dirname, file)); // delete file if exist
      return true;
    } catch (error) {
      return false;
    };
  };

  deleteDirectoryMiddleware(
    idPropertyName: string | Array<string>,
    options?: { force?: boolean; next?: boolean; save?: string; send?: string }
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      //id data
      let id: string | Array<any>;
      if (typeof idPropertyName === "string")
        id = req.body[idPropertyName as string] as string;
      else {
        id = req.body[
          (idPropertyName as Array<string>).shift() as string
        ] as Array<any>;
        //@ts-ignore
        for (const name of idPropertyName) id = id[name];
      }
      id = String(id);
      const dirname = path.join(this.baseDir, id);
      //check for exist path
      let result: boolean | null;
      if (!fs.existsSync(dirname)) result = null;
      else {
        let filenames = fs.readdirSync(dirname);
        if (filenames.length > 0 && !options?.force) result = false;
        else {
          fs.rmSync(dirname, { recursive: true, force: true }); //delete file if exist
          result = true;
        }
      }

      if (!!options?.next) {
        if (options?.save) req.body[options.save] = result;
        else req.body["doc"] = result;
        return next();
      }
      //send response to client with user
      return res.status(201).json({
        success: true,
        data: !!options?.send ? req.body[options?.send] : result,
      });
    };
  }

  private updateRootDirectories() {
    // PATH CEHCK
    for (const step of this.imageDir.split("/")) {
      this.baseDir = path.join(this.baseDir, step);
      //if path not exist, create path
      if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir);
    }
  }

  private async preCreateDirectories() {
    const personnel: IPersonnel[] = await read(Personnel);
    for (const person of personnel) {
      try {
        fs.mkdirSync(path.join(this.baseDir, this.imageDir, person.id));
      } catch (_) { }
    }
  }

  private makeAndReturnNewDirectoryForUser(id: string) {
    const p = path.join(this.baseDir, id);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p);
      return p;
    }
    return p;
  }

}
