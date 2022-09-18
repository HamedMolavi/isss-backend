import { fileName, location, setFileInRedis, getImageFromRedis, deleteImageInRedis, uploadAvatar } from "./../../tools/fileUpload";
import { NextFunction, Router, Request, Response } from "express";
import fs from "fs";
import { getTokenAndVerify } from "./../../tools/authentication";
import axios from "axios";
import path from "path";
import PersonImage, { IPersonImage } from "./../../models/personImage";
import { hashJson } from "./../../tools/hash";
import { ApiError } from "../../error/error.handler";
import mongoose, { Mongoose } from "mongoose";

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
router.post("/upload", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get personnel_code from url
    const { perssonel_id, image_str } = req.body;
    if (!perssonel_id || !image_str) {
      req.flash("error", "Please enter a personnel_code");
      return next(new ApiError(400, "Please enter a personnel_code"));
    }
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
    //get file from request and change format  to json and get file name and save in server with personnel_code
    let result = await uploadAvatar(image_str, perssonel_id);
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
});

//create api for download image
router.get("/download/:fileName", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
    //get file name from request params
    const fileName = req.params.fileName;

    //get directory path
    const directoryPath = path.join(__dirname, "./../../../assets/image/") + fileName + "/";

    //send image to client
    await res.download(directoryPath + "avatar.jpg", fileName, (err) => {
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
router.post("/redis/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    // get id from request url
    // const { personnel_id, image_str } = req.body;
    const personnel_id = req.params.id;
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    // // //get file from request and change format  to json
    let reqFile = JSON.parse(JSON.stringify(req.files));

    // // //move file to buffer
    let image = Buffer.from(reqFile.file.data, "base64");
    // // //convert file to base64
    let fileBase64 = image.toString("base64");
    // //  let fileName: string =  "test.jpg";

    //create hash for redis id
    let idHashed = hashJson(fileBase64, personnel_id);
    //set file in redis
    let id = await setFileInRedis(fileBase64, idHashed, personnel_id);
    if (!id) {
      req.flash("error", "File not upload");
      return next(new ApiError(400, "File not upload"));
    }
    //get url AI for send request
    const dbUri: string = process.env["API_AI_REDIS_NAME"] as string;
    //send request to AI api for send id_personnel
    var data = JSON.stringify({
      id: idHashed,
    });
    var config = {
      method: "post",
      url: "http://192.168.1.20:23581/redis/face",
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios(config)
      .then(function (response) {
        console.log(JSON.stringify(response.data));
      })
      .catch(function (error) {
        console.log(error);
      });
    res.status(201).send({
      success: true,
      data: {
        message: "Uploaded the file successfully",
        id: idHashed,
      },
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//route for verified image in redis
router.post("/verify", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get body from request
    const requestBody = req.body;
    if (!requestBody.id) {
      req.flash("error", "id is required!");
      return next({ status: 400, message: "id is required" });
    }
    //get jason information from redis
    let redisData: any = await getImageFromRedis(requestBody.id);
    //convert base64 to file
    let image = Buffer.from(redisData.face, "base64");
   // let embedding = Buffer.from(redisData.embedding, "base64");
    //covert base64 to array buffer
    //let embeddingArray: Number[] = Buffer.from(redisData.embedding, "base64").toJSON().data;
    // let embeddingArray =  Uint8Array.from(atob(redisData.embedding), c => c.charCodeAt(0))
    // function bytesToFloatArray(bytes: any) {
    //   var output = bytes.buffer; // Get the ArrayBuffer from the Uint8Array.
    //   return new Float32Array(output); // Convert the ArrayBuffer to floats.
    // }
   // let embeddingArray = bytesToFloatArray(embedding);
    //Face recognition condition
    if (redisData.has_face === 1) {
      let guid: string = requestBody.id;
      //create name for image
      let fileName: string = guid + ".jpeg";

      //todo : convert BGR to RGB

      //define path for save image

      let pathSave = path.join(__dirname, `./../../../assets/image/${redisData.personnel_id}`);
      if (!fs.existsSync(pathSave)) {
        fs.mkdirSync(pathSave);
      }
      pathSave = path.join(__dirname, `./../../../assets/image/${redisData.personnel_id}/${redisData.personnel_id}-`);
      //write image in path
      await fs.writeFile(pathSave + fileName, image, (err) => {
        if (err) {
          return next(new ApiError(500, "internal server error" + err.message));
        }
      });
      let embedding = redisData.embedding;
      //create new personimage
     // if (!personImage) {
        let personImage = new PersonImage();
        personImage.person_id = redisData.personnel_id;
        personImage.vector= embedding;
        //  save personimage in database
        await personImage.save();
     // }
      //  delete jason image in redis
      let result = await deleteImageInRedis(requestBody.id.toString());
      //   send response to client
      return res.status(200).send({
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
});

export default router;
