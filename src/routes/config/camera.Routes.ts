import { NextFunction, Router, Request, Response } from "express";
import Camera from "../../db/mongo/models/camera";
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
import { getStreamUri } from "../../tools/camera.tools";

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
  createMiddleware(["name", "type", "index", "url", "plate_base", "target_fps", "zones"], Camera, { next: true, save: "addedCamera" })
);

//route for get id camera with ip from back RTSPtoWEBRTC
router.post(
  "/getIdStream",
  //verify body request
  dtoValidationMiddleware(CameraInfoBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
);

//route for get cameras list
router.get("",
  readMiddleware(Camera, searchRaw, { populate: true }),
);


//route for get camera by id from DB
router.get("/:id",
  readByIdMiddleware(Camera, { populate: true })
);

//add route for edit camera
router.patch("/:id",
  dtoValidationMiddleware(UpdateCameraBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  updateByIdMiddleware(Camera)
);

//add route for delete camera
router.delete("/:id",
  deleteByIdMiddleware(Camera) // delete also triggers the remove post function of Camera schema
);
export default router;
