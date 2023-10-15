import { NextFunction, Router, Request, Response } from "express";
import Camera from "../../db/mongo/models/camera";
import { getStreamUri, testCameraMiddleware } from "../../tools/camera.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CameraInfoBody, CreateCameraBody } from "../../validation/dto/camera.dto";
import { existCheck } from "../../validation/db";
import { CameraInfoKeys } from "../../types/interfaces/camera.interface";
import { createMiddleware } from "../../db/mongo/create.database";
import { readMiddleware, readByIdMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import { ApiError } from "../../types/classes/error.class";

//create router for add to server
const router: Router = Router();

//add route for register new camera
router.post(
  "",
  dtoValidationMiddleware(CreateCameraBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Camera, { $and: [{ ip: "ip" }, { nvr: "nvr" }], }, "Camera already exists!"),
  getStreamUri(CameraInfoKeys), //get live stream uri(rtsp link from camera)
  createMiddleware(["section_id", "nvr", "ip", "name", "username", "password", "network", "is_enabled", "muted", "camera_type", "url"], Camera)
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
  readMiddleware(Camera, (search) => { return { ip: { $regex: search, $options: "i" } } })
);

//route for get camera by id from DB
router.get("/:id",
  readByIdMiddleware(Camera)
);

//add route for edit camera
router.patch("/:id",
  updateByIdMiddleware(Camera) // TODO: test for edit
);

//add route for delete camera
router.delete("/:id",
  deleteByIdMiddleware(Camera) // delete also triggers the remove post function of Camera schema
);

export default router;
