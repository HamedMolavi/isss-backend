import {
  fileName,
  location,
  setFileInRedis,
  getImageFromRedis,
  deleteImageInRedis,
  uploadAvatar,
} from "./../../tools/fileUpload";
import { NextFunction, Router, Request, Response } from "express";
import fs from "fs";
import { getTokenAndVerify } from "./../../tools/authentication";
import axios from "axios";
import Guid from "./../../tools/createGuid";
import path from "path";
import PersonImage, { IPersonImage } from "./../../models/personImage";
import multer from "multer";
import { hashJson } from "./../../tools/hash";
import { ApiError } from "../../error/error.handler";

//create router for add to server
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

const const_role = process.env.const_role || "user";

type resultType = {
  name: string;
  path: string;
};

//create api for upload image
router.post(
  "/upload/:personnel_code",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get personnel_code from url
      const personnel_code = req.params.personnel_code;
      if (!personnel_code) {
        req.flash("error", "Please enter a personnel_code");
        return next(new ApiError(400, "Please enter a personnel_code"));
      }
      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if (!token) {
        return null;
      }
      //get file from request and change format  to json and get file name and save in server with personnel_code
      let result: resultType | void = await uploadAvatar(
        req,
        res,
        personnel_code,
        next
      );
      if (!result) {
        return null;
      }
      //send response to client
      res.status(201).send({
        success: true,
        data: {
          name: result.name,
          location: result.path,
          message: "Uploaded the file successfully: " + result,
        },
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  }
);

//create api for download image
router.get(
  "/download/:fileName",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if (!token) {
        return null;
      }
      //get file name from request params
      const fileName = req.params.fileName;

      //get directory path
      const directoryPath =
        path.join(__dirname, "./../../../assets/image/") + fileName + "/";

      //send image to client
      await res.download(directoryPath + "avatar.png", fileName, (err) => {
        if (err) {
          req.flash("error", "File not found");
          return next(new ApiError(404, "File not found"));
        }
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  }
);

//create api for get list file upload
router.get(
  "/list",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if (!token) {
        return null;
      }
      let fileInfos: object[] = [];
      //get directory path
      const directoryPath = path.join(__dirname, "./../../../assets/image/");
      //get list directory images in directory path
      let imageFolders = await fs.promises.readdir(directoryPath);
      //loop through list directory images and get file info in each directory
      for (let i = 0; i < imageFolders.length; i++) {
        //get file info in each directory
        let imageFiles = await fs.promises.readdir(
          directoryPath + "/" + imageFolders[i]
        );
        //loop through list file in each directory and get file info
        for (let j = 0; j < imageFiles.length; j++) {
          //get file info
          let fileInfo = await fs.promises.stat(
            directoryPath + "/" + imageFolders[i] + "/" + imageFiles[j]
          );
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
  }
);

//api for upload image to redis
router.post(
  "/redis",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      // get id from request url
      let personnel_id = req.query.id as string;
      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if (!token) {
        return null;
      }

      //get file from request and change format  to json
      let reqFile = JSON.parse(JSON.stringify(req.files));

      //move file to buffer
      let image = Buffer.from(reqFile.file.data, "base64");
      //convert file to base64
      let fileBase64 = image.toString("base64");
      //create hash for redis id
      let idHashed = hashJson(fileBase64, personnel_id);
      //set file in redis
      let id = await setFileInRedis(fileBase64, idHashed);
      if (!id) {
        req.flash("error", "File not upload");
        return next(new ApiError(400, "File not upload"));
      }
      //get url AI for send request
      const dbUri: string = process.env["API_AI_REDIS_NAME"] as string;
      //send request to AI api for send id_personnel
      await axios
        .post(dbUri, {
          id: idHashed,
        })
        .then(function (response) {
          console.log("Response From API AI :" + response.status);
          req.flash("info", "Uploaded the file successfully");
          //  send response to client
        })
        .catch(function (error) {
          console.log(error.response.data);
          return next(
            new ApiError(500, "internal server error" + error.message)
          );
        });
      res.status(201).send({
        message: "Uploaded the file successfully",
      });
    } catch (err: any) {}
  }
);

// //add package multer for upload file
// var storage = multer.memoryStorage();
// //create multer for upload file and save in memory
// var upload = multer({ storage: storage });
// //create api for upload image to redis
// router.post(
//   "/redis",
//   upload.single("file"),
//   async function (req: Request, res: Response, next: NextFunction) {
//     try {
//       // get id from request url
//       let personnel_id = req.query.id as string;
//       //get token from header request and verify
//       let token = getTokenAndVerify(req, const_role, next);
//       if (!token) {
//         return null;
//       }
//       //get file from request body and save
//       let fileBase64: string;
//       let file = req.file!.buffer;
//       //convert file to base64
//       fileBase64 = file.toString("base64");
//       //create hash for redis id
//       let idHashed = hashJson(fileBase64, personnel_id);
//       //set file in redis
//       let id = await setFileInRedis(fileBase64, idHashed);
//       if (!id) {
//         req.flash("error", "File not upload");
//         return next(new ApiError(400, "File not upload"));
//       }
//       //get url AI for send request
//       const dbUri: string = process.env["API_AI_REDIS_NAME"] as string;
//       //send request to AI api for send id_personnel
//       await axios
//         .post(dbUri, {
//           id: idHashed,
//         })
//         .then(function (response) {
//           console.log("Response From API AI :" + response.status);
//           req.flash("info", "Uploaded the file successfully");
//           //  send response to client
//         })
//         .catch(function (error) {
//           console.log(error.response.data);
//           return next(
//             new ApiError(500, "internal server error" + error.message)
//           );
//         });
//       res.status(201).send({
//         message: "Uploaded the file successfully",
//       });
//       //send error if file is not upload
//     } catch (err: any) {
//       return next(new ApiError(500, "internal server error ->" + err.message));
//     }
//   }
// );

//route for verified image in redis
router.post(
  "/verify",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get body from request
      const { id } = req.body;
      if (!id) {
        req.flash("error", "id is required!");
        return next({ status: 400, message: "id is required" });
      }
      //get jason information from redis
      let redisData: any = await getImageFromRedis(id);
      //convert base64 to file
      let image = Buffer.from(redisData.face, "base64");
      //covert base64 to array buffer
      let embeddingArray: Number[] = Buffer.from(
        redisData.embedding,
        "base64"
      ).toJSON().data;
      //Face recognition condition
      if (redisData.has_face === 1) {
        let guid: string = id + "-" + Guid.newGuid();
        //create name for image
        let fileName: string = guid + ".jpg";

        //todo : convert BGR to RGB

        //define path for save image
        let pathSave = path.join(__dirname, "./../../../assets/uploads/");
        //write image in path
        await fs.writeFile(pathSave + fileName, image, (err) => {
          if (err) {
            return next(
              new ApiError(500, "internal server error" + err.message)
            );
          }
        });
        //query to database for search personnel
        let personImage = await PersonImage.findOne({ guid: fileName }).exec();

        //create new personimage
        if (!personImage) {
          personImage = new PersonImage();
          personImage.guid = fileName;
          personImage.vector = embeddingArray;
          //  save personimage in database
          await personImage.save();
        }
        // personImage = {
        //     person_id: '6283724be1996b883080a495',
        //     guid: guid,
        //     vector: embeddingArray,
        // }

        //  save personimage in database
        //await personImage!.save();
        //  delete jason image in redis
        let result = await deleteImageInRedis(id.toString());
        //   send response to client
        res.status(200).send({
          message: "Verified the file successfully",
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
  }
);

export default router;
