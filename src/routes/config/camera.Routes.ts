import { Router } from "express";
import Camera from "../../db/mongo/models/camera";
import { getStreamUri } from "../../tools/camera.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateCameraBody } from "../../validation/dto/camera.dto";
import { existCheck } from "../../validation/db/cameraRegister.validation";
import { CameraInfoKeys } from "../../interfaces/camera.interface";
import { create } from "../../db/mongo/create.database";
import { readMiddleware, readByIdMiddleware } from "../../db/mongo/read.database";
import { updateById } from "../../db/mongo/update.database";
import { deleteById } from "../../db/mongo/delete.database";

//create router for add to server
const router: Router = Router();

//add route for register new camera
router.post(
  "",
  dtoValidationMiddleware(CreateCameraBody, { skipMissingProperties: false, detailedMassage: false, info: "please complete all fields" }),
  existCheck(Camera, { $and: [{ ip: "ip" }, { nvr: "nvr" }], }, "Camera already exists!"),
  getStreamUri(CameraInfoKeys), //get live stream uri(rtsp link from camera)
  create(["section_id", "nvr", "ip", "name", "username", "password", "network", "is_enabled", "muted", "camera_type", "url"], Camera)
);


//route for get cameras list
router.get(
  "",
  readMiddleware(Camera, (search) => { return { ip: { $regex: search, $options: "i" } } })
);

//route for get camera by id from DB
router.get(
  "/:id",
  readByIdMiddleware(Camera)
);

//add route for edit camera
router.patch(
  "/:id",
  updateById(Camera)
);

//add route for delete camera
router.delete(
  "/:id",
  deleteById(Camera) // delete also triggers the remove post function of Camera schema
);

export default router;
