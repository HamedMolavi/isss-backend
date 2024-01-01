import { NextFunction, Router, Request, Response } from "express";
import Camera from "../../db/mongo/models/camera";
import { getStreamUri, testCameraMiddleware } from "../../tools/camera.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CameraInfoBody, CreateCameraBody } from "../../validation/dto/camera.dto";
import { existCheck } from "../../validation/db";
import { CameraInfoKeys, ICamera } from "../../types/interfaces/camera.interface";
import { createMiddleware } from "../../db/mongo/create.database";
import { readMiddleware, readByIdMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import { ApiError } from "../../types/classes/error.class";
import { Document, Types } from "mongoose";
import User from "../../db/mongo/models/user";
import { IUser } from "../../types/interfaces/user.interface";
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
  existCheck(Camera, { $and: [{ ip: "ip" }, { nvr: "nvr" }], }, "Camera already exists!"),
  getStreamUri(CameraInfoKeys), //get live stream uri(rtsp link from camera)
  createMiddleware(["section_id", "nvr", "ip", "name", "username", "password", "network", "is_enabled", "muted", "camera_type", "url"], Camera, { next: true, save: "addedCamera" }),
  // TODO: clean this up => it should be handled in UI
  async function middleware(req: Request, res: Response, next: NextFunction) {
    const cam: ICamera & Required<{ _id: Types.ObjectId; }> = req.body["addedCamera"];
    let user = await User.findById(req.user._id).exec() as IUser & Required<{ _id: Types.ObjectId; }>;
    let accessedCameras = user.camera_access ?? [];
    accessedCameras.push(cam._id);
    user.camera_access = accessedCameras;
    await User.findOneAndUpdate(req.user._id, { $set: { camera_access: accessedCameras } }, {
      new: true,
      overwrite: true
    });
  }
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
  readByIdMiddleware(Camera, { populate: true })
);

//add route for edit camera
router.patch("/:id",
  injectDataMiddleware((body: { [key: string]: any }) => body?.damaged ?? false, { injData: "damaged" }),
  updateByIdMiddleware(Camera) // TODO: test for edit
);

//add route for delete camera
router.delete("/:id",
  deleteByIdMiddleware(Camera) // delete also triggers the remove post function of Camera schema
);
function sendFunction(
  camera: (Document<unknown, any, ICamera> & Omit<ICamera & Required<{ _id: Types.ObjectId; }>, never>),
  req: Request) {
  if (req.user.role === "admin") return camera
  else if (req.user.role === "user") if (req.user.camera_access?.some(((id) => id == camera.id))) return camera;
  // return undefined to skip if user has no access
  return;
};
export default router;
