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
  if (search.includes(":")) {
    let res: { [key: string]: any } = {}
    const splitted = search.split(':');
    for (let i = 0; i < splitted.length; i += 2) {
      const key = splitted[i];
      let value: any = splitted[i + 1];
      if (!value) continue
      else if (value?.toLowerCase() === 'true') value = true;
      else if (value?.toLowerCase() === 'false') value = false;
      res[key] = value;
    }
    return res;
    // const key = search.split(':').at(0);
    // let value: any = search.split(':').at(1);
    // if (value?.toLowerCase() === 'true') value = true;
    // if (value?.toLowerCase() === 'false') value = false;
    // if (!!key) return { [key]: value }
  }
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
  // existCheck(Personnel, { $and: [{ first_name: "first_name" }, { last_name: "last_name" }] }, "Personnel already exists!"),
  injectDataMiddleware(allowedPassConvert, { injData: "allowed_pass" }),
  createMiddleware(["first_name", "last_name", "national_code", "email", "phone_number", "job_id", "tracked", "personnel_code", "camera_whitelist", "allowed_pass", "alert"], Personnel, { next: true, save: "doc" }),
  fs.uploadAvatarMiddleware("avatar_str", "doc._id", { fileName: "avatar", resultPropertyName: "doc" }),
);

//route for get personnels list
router.get(["", "/search", "/hostile", "/guest", "/client"],
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
  fs.uploadAvatarMiddleware("avatar_str", "doc._id", { fileName: "avatar", resultPropertyName: "doc" }),
);

//add route for delete personnel
router.delete("/:id",
  DoNotAllowOnDefault(Personnel, { first_name: "Global" }),
  deleteByIdMiddleware(Personnel, { next: true, save: "doc" }), //also deletes image vector in post remove schema
  fs.deleteDirectoryMiddleware(["doc", "_id"], { force: true, send: "doc" })
);

const specialTypes = ["hostile", "guest", "client"]
async function personnelSendFunction(person: IPersonnel & Required<{ _id: mongoose.Types.ObjectId }>, req: Request) {
  let per: any = person.toJSON();
  // TODO: fetch last location from normalizer server.
  if (!!req?.query?.lastSeen) {
    let logPersonnel = await requestForGetPersonnel(person._id.toString());
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
  }
  if (!!per.allowed_pass) per.allowed_pass = allowedPassRevert(per);
  const type = specialTypes.find(st => req.originalUrl.toLowerCase().includes(st));
  const person_st = specialTypes.find((st) => person.person_type.includes(st));
  switch (true) {
    case !!type && type === person_st:
      return per;
    case !type && !person_st:
      return per;
    default:
      return undefined;
  }
};

export default router;
