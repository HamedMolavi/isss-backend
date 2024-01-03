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
import { CreatePersonnelBody } from "../../validation/dto/personnel.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import mongoose, { Document } from "mongoose";

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
  existCheck(Personnel, { $or: [{ national_code: "national_code" }, { personnel_code: "personnel_code" }] }, "Personnel already exists!"),
  createMiddleware(["first_name", "last_name", "national_code", "email", "phone_number", "job_id", "tracked", "personnel_code", "section_id", "camera_whitelist", "is_active", "is_employee", "is_dismissed"], Personnel, { next: true, save: "doc" }),
  fs.uploadAvatarMiddleware("avatar_str", ["doc", "_id"], { name: "avatar" }, "doc"),
);

//route for get personnels list
router.get(["", "/search"],
  readMiddleware(Personnel, rawSearch, { next: true, send: personnelSendFunction }));

//route for get personnel by id from DB
router.get("/:id",
  readByIdMiddleware(Personnel)
);

//add route for edit personnel
router.patch("/:id",
  updateByIdMiddleware(Personnel, { next: true, save: "doc" }),
  fs.uploadAvatarMiddleware("avatar_str", ["doc", "_id"], { name: "avatar" }, "doc"),
);

//add route for delete personnel
router.delete("/:id",
  deleteByIdMiddleware(Personnel, { next: true, save: "doc" }), //also deletes image vector in post remove schema
  fs.deleteDirectoryMiddleware(["doc", "_id"], { force: true, send: "doc" })
);

async function personnelSendFunction(_personnel: any) {
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
  return per;
};

export default router;
