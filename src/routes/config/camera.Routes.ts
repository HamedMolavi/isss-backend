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
import mongoose, { Document, Model, Types } from "mongoose";
import User from "../../db/mongo/models/user";
import { IUser } from "../../types/interfaces/user.interface";
import { injectDataMiddleware } from "../../tools/request.tools";
import Personnel from "../../db/mongo/models/personnel";
import Car from "../../db/mongo/models/car";
import Schedule from "../../db/mongo/models/schedule";
import ModelToCamera from "../../db/mongo/models/modelToCamera";

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
  createMiddleware(["section_id", "nvr", "ip", "name", "username", "password", "network", "is_enabled", "camera_type", "url"], Camera, { next: true, save: "addedCamera" }),
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
    return res.status(201).json({
      success: true,
      data: cam,
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

//listing routes
router.get("/:id/white/personnel",
  readMiddleware(Personnel, (search) => { return { camera_whitelist: { $in: [new mongoose.Types.ObjectId(search)] } } }, { populate: true, searchFromParams: (params) => params.id })
);
router.get("/:id/white/cars",
  readMiddleware(Car, (search) => { return { camera_whitelist: { $in: [new mongoose.Types.ObjectId(search)] } } }, { populate: true, searchFromParams: (params) => params.id })
);
router.get("/:id/white",
  readMiddleware(Car, (search) => { return { camera_whitelist: { $in: [new mongoose.Types.ObjectId(search)] } } }, { populate: true, searchFromParams: (params) => params.id, next: true, save: "cars" }),
  readMiddleware(Personnel, (search) => { return { camera_whitelist: { $in: [new mongoose.Types.ObjectId(search)] } } }, { populate: true, searchFromParams: (params) => params.id, next: true, save: "personnel" }),
  async function middleware(req: Request, res: Response, next: NextFunction) {
    const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
    const perPage = (req.query.perPage as string).toLowerCase() === "all" ? 10000 : parseInt(req.query.perPage as string) > 0 ? parseInt(req.query.perPage as string) : 1
    const data = [req.body.personnel, req.body.cars];
    return res.status(200).json({
      success: true,
      data,
      page,
      perPage,
      total: data.length,
      pages: Math.ceil(data.length / perPage),
    });
  }
);
router.get("/:id/schedules",
  readMiddleware(Schedule, async (search) => {
    // { ip: { $regex: search, $options: "i" } },
    let result: { $or: Array<{ "model_camera_id": any }> } = { $or: [] };
    const m2cs = await ModelToCamera.find({ camera_id: new mongoose.Types.ObjectId(search) }).exec();
    for (const m2c of m2cs) result["$or"].push({ "model_camera_id": m2c._id })
    return result
  }, { populate: true, searchFromParams: (params) => params.id }),
);
//route for get camera by id from DB
router.get("/:id",
  readByIdMiddleware(Camera, { populate: true })
);

//add route for edit camera
router.patch("/:id",
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
  if (req.user.role === "admin") return camera
  else if (req.user.role === "user") if (req.user.camera_access?.some(((id) => id == camera.id))) return camera;
  // return undefined to skip if user has no access
  return;
};
export default router;
