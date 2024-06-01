import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import { ApiError } from "../../types/classes/error.class";
import PersonImage from "../../db/mongo/models/personImage";
import { ImageFileSystem } from "../../tools/kafkaFile.tools";
import Personnel from "../../db/mongo/models/personnel";
import mongoose, { Schema } from "mongoose";
import { IPersonImage } from "../../types/interfaces/personImage.interface";
import { readMiddleware } from "../../db/mongo/read.database";

//create customized filesystem
const fs = new ImageFileSystem();
//create router for add to routes file
const router: Router = Router();

router.get(["", "/hostile"],
  readMiddleware(PersonImage, undefined, { populate: true, next: true, save: "personnelImages", forceAll: true }),
  async (req, res, next) => {
    try {
      //query for get personnel by id from DB
      let personnel = (await Personnel.find().exec()).filter(per => (per?.first_name === "Hostile") === req.originalUrl.toLowerCase().includes("hostile"));
      let personnelImages: (IPersonImage & Required<{
        _id: Schema.Types.ObjectId;
      }>)[] = req.body["personnelImages"];
      let result = personnel.map(person => {
        let pathRead = path.join(__dirname, `../../../assets/image/${person.id}/`);
        const images = personnelImages.filter((personImage: any) => !!personImage.person_id && ((mongoose.isObjectIdOrHexString(personImage.person_id.toString()) ? personImage.person_id.toString() : personImage.person_id.id) === person.id));
        const files = images.map(image => person.id + "-" + image.hash_id + ".jpeg");
        const imageFilesRead = fs.readFiles(pathRead, files);
        return {
          "_id": person.id,
          "person_id": images?.[0]?.person_id,
          "images": imageFilesRead ?? []
        }
      });
      //return response to client
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  })

//route for get personnel by id from DB
router.get(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      let id: string = req.params.id;
      //verify body request
      if (!id) {
        req.flash("error", "Please enter id");
        return next(new ApiError(400, "Please enter id"));
      }

      //query for get personnel by id from DB
      let personImages = await PersonImage.find({ person_id: id })
        .select("hash_id")
        .exec();
      //send not found if personnel not found
      if (!personImages) {
        req.flash("error", "personImages not found");
        return next(new ApiError(404, "personImages not found"));
      }
      let files = personImages?.map((elem) => id + "-" + elem.hash_id + ".jpeg");
      //define path folder fo read files
      let pathRead = path.join(__dirname, `./../../../assets/image/${id}/`);
      let faces_base64: Object[] | null = [];
      //check for exist path
      faces_base64 = fs.readFiles(pathRead, files); //read all file in directory path an convert to base62 and get list base64
      if (faces_base64 == null) {
        req.flash("error", "path not found");
        return next(new ApiError(404, "not found"));
      }
      //return response to client
      return res.status(200).json({
        success: true,
        data: faces_base64,
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
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
