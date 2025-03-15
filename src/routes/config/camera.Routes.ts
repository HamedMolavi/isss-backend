import { NextFunction, Router, Request, Response } from "express";
import Camera from "../../db/mongo/models/camera";
import { getStreamUri, testCameraMiddleware } from "../../tools/camera.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CameraInfoBody, CreateCameraBody, UpdateCameraBody } from "../../validation/dto/camera.dto";
import { existCheck } from "../../validation/db";
import { CameraInfoKeys, ICamera } from "../../types/interfaces/camera.interface";
import { createMiddleware } from "../../db/mongo/create.database";
import { readMiddleware, readByIdMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import mongoose, { Document, Model, Types } from "mongoose";
import { injectDataMiddleware } from "../../tools/request.tools";

//create router for add to server
const router: Router = Router();
let searchRaw = (search: string) => {
  if (["true", "false"].includes(search.toLowerCase())) return { damaged: search.toLowerCase() === "true" }
  return {
    $or: [
      { ip: { $regex: search, $options: "i" } },
      { nvr: { $regex: search, $options: "i" } },
      { network: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } }
    ]
  };
};

//add route for register new camera
router.post(
  "",
  dtoValidationMiddleware(CreateCameraBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  //existCheck(Camera, { $and: [{ ip: "ip" }, { nvr: "nvr" }], }, "Camera already exists!"),
  getStreamUri(CameraInfoKeys),
  //getStreamUri(CameraInfoKeys), //get live stream uri(rtsp link from camera)
  createMiddleware(["section_id", "nvr", "ip", "name", "username", "password", "network", "is_enabled", "camera_type", "url"], Camera, { next: true, save: "addedCamera" })
);

//route for get id camera with ip from back RTSPtoWEBRTC
router.post(
  "/getIdStream",
  //verify body request
  dtoValidationMiddleware(CameraInfoBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  testCameraMiddleware
);

//route for get cameras list
router.get("",
  readMiddleware(Camera, searchRaw, { populate: true, send: sendFunction }),
);


//route for get camera by id from DB
router.get("/:id",
  readByIdMiddleware(Camera, { populate: true, send: sendFunction })
);

//add route for edit camera
router.patch("/:id",
  dtoValidationMiddleware(UpdateCameraBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  injectDataMiddleware((body: { [key: string]: any }) => body?.damaged ?? false, { injData: "damaged" }),
  updateByIdMiddleware(Camera)
);

//add route for delete camera
router.delete("/:id",
  deleteByIdMiddleware(Camera) // delete also triggers the remove post function of Camera schema
);
function sendFunction(
  camera: (Document<unknown, any, ICamera> & Omit<ICamera & Required<{ _id: Types.ObjectId; }>, never>),
  req: Request) {
  return {
    _id: camera._id,
    section_id: camera.section_id,
    network: camera.network,
    url: camera.url,
    nvr: camera.nvr,
    ip: camera.ip,
    damaged: camera.damaged,
    name: camera.name,
    username: camera.username,
    password: camera.password,
    is_enabled: camera.is_enabled,
    create_date: camera.create_date,
    camera_type: camera.camera_type,
  };
};
export default router;
