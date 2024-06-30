import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import { requestForGetPersonnel } from "../../db/elastic/connect.database";
import { ApiError } from "../../types/classes/error.class";
import Camera from "../../db/mongo/models/camera";
import url from "url";
import PersonImage from "../../db/mongo/models/personImage";
import { ImageFileSystem } from "../../tools/kafkaFile.tools";
import Personnel from "../../db/mongo/models/personnel";
import { IPersonnel } from "../../types/interfaces/personnel.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreatePersonnelBody, UpdatePersonnelBody } from "../../validation/dto/personnel.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import mongoose, { Document } from "mongoose";
import Time, { allowedPassConvert, allowedPassRevert } from "../../tools/time.tools";
import { DoNotAllowOnDefault, injectDataMiddleware } from "../../tools/request.tools";

const fs = new ImageFileSystem();
//create router for add to routes file
const router: Router = Router();
const rawSearch = (search: string) => {
  return {
    $or: [
      { first_name: { $regex: search } },
      { last_name: { $regex: search } },
      { national_code: { $regex: search } },
      { personnel_code: { $regex: search } },
      { phone_number: { $regex: search } }]
  }
};


//add route for register new personnel
router.post("",
  dtoValidationMiddleware(CreatePersonnelBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Personnel, { $and: [{ first_name: "first_name" }, { last_name: "last_name" }] }, "Personnel already exists!"),
  injectDataMiddleware(allowedPassConvert, { injData: "allowed_pass" }),
  createMiddleware(["first_name", "last_name", "national_code", "email", "phone_number", "job_id", "tracked", "personnel_code", "camera_whitelist", "department_whitelist", "section_whitelist", "schedule_whitelist", "allowed_pass", "alert"], Personnel, { next: true, save: "doc" }),
  fs.uploadAvatarMiddleware("avatar_str", ["doc", "_id"], { fileName: "avatar" }, "doc"),
);

//route for get personnels list
router.get(["", "/search", "/hostile", "/guest"],
  readMiddleware(Personnel, rawSearch, { next: false, send: personnelSendFunction, populate: true })
);

//route for get personnel by id from DB
router.get("/:id",
  readByIdMiddleware(Personnel, { populate: true })
);

//add route for edit personnel
router.patch("/:id",
  dtoValidationMiddleware(UpdatePersonnelBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Personnel, { $or: [{ national_code: "national_code" }, { personnel_code: "personnel_code" }] }, "Personnel already exists!"),
  updateByIdMiddleware(Personnel, {
    next: true, save: "doc", update: {
      "time_start": {
        name: "allowed_pass.start",
        fn: (payload) => (new Date(payload.date_start + " " + payload.time_start + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime()
      },
      "time_end": {
        name: "allowed_pass.end",
        fn: (payload) => (new Date(payload.date_end + " " + payload.time_end + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime()
      }
    }
  }),
  fs.uploadAvatarMiddleware("avatar_str", ["doc", "_id"], { fileName: "avatar" }, "doc"),
);

//add route for delete personnel
router.delete("/:id",
  DoNotAllowOnDefault(Personnel, { first_name: "Global" }),
  deleteByIdMiddleware(Personnel, { next: true, save: "doc" }), //also deletes image vector in post remove schema
  fs.deleteDirectoryMiddleware(["doc", "_id"], { force: true, send: "doc" })
);

const specialTypes = ["Hostile", "Guest"]
async function personnelSendFunction(_personnel: any, req: Request) {
  let per = _personnel.toJSON();
  // TODO: fetch last location from normalizer server.
  let logPersonnel = await requestForGetPersonnel(_personnel._id.toString());
  let _camera;
  if (logPersonnel?.data?.hits?.hits?.length > 0) {
    try {
      _camera = await Camera.findById(logPersonnel.data.hits.hits[0]?._source?.camera_id).populate("section_id").exec();
    } catch (error: any) {
      if (error.name.toString() === 'CastError') console.log(`!!! Elastic data error: ${logPersonnel.data.hits.hits[0]?._source?.camera_id} as camera._id is wrong`);
    }
    per.lastTimeSeen = new Date(logPersonnel.data?.hits?.hits[0]?._source?.timestamp);
  }
  (per.lastCameraSeen = _camera ? _camera.name : ""), (per.lastSection = _camera ? _camera.section_id : "");
  if (!!per.allowed_pass) per.allowed_pass = allowedPassRevert(per);
  const type = specialTypes.find(t => req.originalUrl.toLowerCase().includes(t.toLowerCase()));

  return (!!type ? per?.first_name === type : !specialTypes.includes(per?.first_name)) ? per : undefined;
};

export default router;
