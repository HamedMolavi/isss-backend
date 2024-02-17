import path from "path";
import fs from "fs";
import {
  Consumer,
  Kafka,
  Producer,
  logLevel,
} from "kafkajs";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../types/classes/error.class";
import { hashString } from "./hash";
import { read } from "../db/mongo/read.database";
import Personnel from "../db/mongo/models/personnel";
import { IPersonnel } from "../types/interfaces/personnel.interface";
import { getPropertyFromBody, randomUuid } from "./utils.tools";
// TODO: clean this shit up.


export class SnapshotKafka {
  buffer: { [key: string]: { [key: string]: any } };
  consumer: Consumer;
  producer: Producer;
  //redisClient: RedisClientType | undefined
  middlewareWraper: (
    f: Function,
    options: {
      resultPropertyName?: string | undefined;
      isInReq?: boolean;
      save?: string | undefined;
      next?: boolean;
    },
    ...args: any[]
  ) => RequestHandler;
  // json: Function

  constructor() {
    this.buffer = {};
    this.consumer = new Kafka({
      logLevel: logLevel.ERROR,
      brokers: process.env["KAFKA_BOOTSTRAP"].split(","),
      //brokers: process.env["KAFKA_BOOTSTRAP"]
      // }).consumer({ groupId: "sdgfsdfgas" });
    }).consumer({ groupId: "aaaaaa" });
    this.consumer
      .subscribe({ topic: "snapshot", fromBeginning: false })
      .then(() => {
        this.consumer.run({
          eachMessage: async ({ message }) => {
            const msg = JSON.parse(message.value?.toString("utf8") as string);
            if (message.key?.toString() === "asghar")
              this.buffer[msg["personnel_id"]] = {
                personnel_id: msg["personnel_id"],
                personnel_name: msg["personnel_name"] as string | null,
                face: msg["cropped_face"] as string | null,
                masked_face: msg["masked_face"] as string | null,
                masked_embd: msg["masked_embd"] as number[] | null,
                embedding: msg["cropped_embd"] as number[] | null,
                has_face: msg["has_face"] as boolean,
                multi_face: msg["multi_face"] as boolean | null,
              };
            else if (message.key?.toString() === "kobra") {
              this.buffer[msg["id"]] = msg["matches"]?.map((elem: any) => {
                return elem.id;
              });
            }
            else if (message.key?.toString() === "ghabil") {
              this.buffer[msg["personnel_id"]] = {
                status_code: msg["status_code"] as number | null,
                success: msg["success"] as boolean | null,
                message: msg["message"] as string | null,
              };
            }
          },
        });
      });

    this.producer = new Kafka({
      logLevel: logLevel.ERROR,
      brokers: process.env["KAFKA_BOOTSTRAP"].split(","),
    }).producer({
      retry: {
        restartOnFailure: async (err) =>
          !Boolean(console.log("Kafka Connect Failure:", err)),
      },
      allowAutoTopicCreation: true, // TODO: should be false.
    });
    this.producer.connect();
    this.middlewareWraper =
      (
        f: Function,
        options: {
          resultPropertyName?: string | undefined;
          isInReq?: boolean;
          save?: string | undefined;
          next?: boolean;
        },
        ...args: any[]
      ) =>
        async (req: Request, res: Response, next: NextFunction) => {
          /*
        takes an function to wrap it with RequestHandler.
        Inside it will call the function with the given args.
        If isInReq is true, you can give property names of req.body in args.
        If resultPropertyName is not undefiend, the result sent to the user will be req.body[resultPropertyName]
        */
          const inputs = options.isInReq
            ? args.reduce((obj, key) => {
              obj[key] = req.body[key];
              return obj;
            }, {})
            : args;
          const result = await f(inputs);
          if (!!options.save) req.body[options.save] = result;
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
        };
  }

  kafkaProduce = async (inputs: { [key: string]: string }) => {
    const full_frame: string = inputs.image_str ?? "";
    const kafka_key: string = Object.keys(inputs).at(-1) ?? "";

    const handlers = {
      soghra: async () => {
        const personnel = await Personnel.findById(inputs.personnel_id).exec();
        const timestamp = new Date(new Date().toLocaleString() + "+0").toISOString();
        const name = personnel ? `${personnel.first_name} ${personnel.last_name}` : '';
        const frame = full_frame?.split(',')[1] ?? full_frame;

        return {
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
      akbar: () => {
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
      habil: () => {
        const timestamp = new Date(new Date().toLocaleString() + "+0").toISOString();
        // const frame = full_frame?.split(',')[1] ?? full_frame;
        return {
          personnel_id: inputs.person_id ?? "",
          vector: inputs.vector ?? [],
          confidence: inputs.confidence ?? "0",
          timestamp: timestamp,
        };
      },
    };

    const handler = handlers[kafka_key as keyof typeof handlers];
    if (!handler) return;

    const redisData = await handler();

    const msg = Buffer.from(JSON.stringify(redisData), "utf8");
    this.producer.send({
      topic: "snapshot",
      messages: [
        {
          key: kafka_key,
          value: msg,
        },
      ],
    });
    return {
      message: "Uploaded the file successfully",
      id: redisData.personnel_id,
    };
  };

  kafkaGet = async (id: any) => {
    let bufferEntry = this.buffer[id.id];
    let count = 0;
    while (!bufferEntry || count > 10) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      bufferEntry = this.buffer[id.id];
      count++;
      if (count == 10) {
        return
      }
    }
    // Initialize the result object with a timestamp
    let result: any = { timestamp: new Date().toISOString() };

    if (Array.isArray(bufferEntry)) {
      // If the buffer entry is an array, include it under a specific key
      result.data = bufferEntry;
      delete this.buffer[id.id];
    } else if (bufferEntry && typeof bufferEntry === 'object') {
      // If the buffer entry is an object, spread its properties into the result
      //@ts-ignore
      result = { ...result, ...bufferEntry };
      delete this.buffer[id.id];
    } else {
      // If there's no data for the given ID, include an error message
      result.error = "No data found for the given ID";
    }

    // Consider whether you need to delete the buffer entry after retrieval
    // delete this.buffer[id];

    return result;
  };
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

  uploadAvatarMiddleware = (
    imagePropertyName: string | Array<string>,
    idPropertyName: string | Array<string>,
    options?: { next?: boolean; fileName?: string },
    resultPropertyName: string = ""
  ) => {
    /*
    use result property name to identify wether you want to send a customized result to the user.
    */
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        let imagePath: string = "";
        let name = "";
        //id data
        let id = String(getPropertyFromBody(req, idPropertyName) ?? "");
        //avatarStr data
        let imageStr = String(getPropertyFromBody(req, imagePropertyName) ?? "");
        let check = !!imageStr && !!id;
        if (check) {
          imageStr = imageStr.split(",").length >= 2 ? imageStr.split(",")[1] : imageStr;
          if (!!options?.fileName) name = options.fileName;
          else {
            const hash = this.hash(imageStr);
            name = `${id}-${hash}`;
            req.body["redisData"][typeof imagePropertyName === "string" ? imagePropertyName : imagePropertyName[imagePropertyName.length - 1]] = hash;
          }
          //convert file to buffer
          let image = Buffer.from(imageStr as string, "base64");
          //get path for save file
          const imageDir = this.makeAndReturnNewDirectoryForUser(id as string);
          imagePath = path.join(imageDir, `${name}.jpeg`);
          //write image in path
          fs.writeFileSync(imagePath, image);
        };
        if (!!options?.next) return next();
        if (!resultPropertyName) {
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
            data: req.body[resultPropertyName]
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

  readFiles(dirname: string, files: Array<string>): object[] | null {
    //check for existance
    files = files.filter((file) => fs.existsSync(path.join(dirname, file)));
    let response: object[] = [];
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
