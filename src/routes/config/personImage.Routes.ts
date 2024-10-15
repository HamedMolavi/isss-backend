import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import { ApiError } from "../../types/classes/error.class";
import PersonImage from "../../db/mongo/models/personImage";
import { ImageFileSystem } from "../../tools/kafkaFile.tools";
import Personnel from "../../db/mongo/models/personnel";
import mongoose, { Schema } from "mongoose";
import { IPersonImage } from "../../types/interfaces/personImage.interface";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";

//create customized filesystem
const fs = new ImageFileSystem();
//create router for add to routes file
const router: Router = Router();

const specialTypes = ["Hostile", "Guest"]
router.get("/?:type(guest|hostile|normal)?$",
  readMiddleware(Personnel, (person_type) => ({ person_type }), {
    populate: true, save: "personnel", forceAll: true,
    "searchFromParams": (params) => params?.type?.toLowerCase() ?? 'normal',
    "send": async (person, _req) => {
      const images = await PersonImage.find({ person_id: person._id }).exec();
      if (!!images.length) {
        let pathRead = path.join(__dirname, `../../../assets/image/${person.id}/`);
        const files = images.map(image => person.id + "-" + image.hash_id + ".jpeg");
        const imageFilesRead = fs.readFiles(pathRead, files);
        return {
          "_id": person.id,
          "person_id": person,
          "images": imageFilesRead ?? []
        }
      } else return undefined;
    }
  }),
);

//route for get personnel by id from DB
router.get(
  "/:id",
  readMiddleware(PersonImage, (id) => ({ person_id: id }), {
    populate: true,
    send: (doc, req) => {
      let person_id: string = req.params.id;
      let file = person_id + "-" + doc.hash_id + ".jpeg";
      //define path folder fo read files
      let pathRead = path.join(__dirname, `./../../../assets/image/${person_id}/`);
      //check for exist path
      let face_base64 = fs.readFiles(pathRead, [file])?.[0];
      return face_base64;
    }
  }),
);

//add route for delete image from folder assets\image
router.delete(
  "/:hash_id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let hash_id = req.params.hash_id;
      if (!hash_id) {
        req.flash("error", "Please enter hashid");
        return next(new ApiError(400, "Please enter hashid"));
      }
      //query for get personnel by id from DB
      let personimage = await PersonImage.findOne({ hash_id: hash_id }).exec();
      if (!personimage) {
        req.flash("error", "personimage Not Found");
        return next(new ApiError(404, "personimage Not Found"));
      };
      const person_id = personimage.person_id.toString();
      // const masked_face_id = personimage.masked_face_id.toString();
      //decleare file name for delete
      let fileNames = [];
      fileNames.push(`${person_id}-${hash_id}.jpeg`);
      //  fileNames.push(`${person_id}-${masked_face_id}.jpeg`);
      //define path folder fo read files
      let pathDelete = path.join(
        __dirname,
        `./../../../assets/image/${person_id}/`
      );
      let result = fs.deleteFiles(pathDelete, fileNames); //delete file in assets folder
      if (!result) {
        req.flash("error", "image not found");
        return next(new ApiError(404, "image not found"));
      }
      //delete from mongo
      let personimageDeleted = await PersonImage.findOneAndDelete({
        hash_id: hash_id,
      }).exec();
      //send response
      return res.status(201).json({
        success: true,
        data: personimageDeleted,
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
);

export default router;
