import { NextFunction, Router, Request, Response } from "express";
import Camera from "../../db/mongo/models/camera";
import { getStreamUri, oldGetStreamUri } from "../../tools/camera.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CameraInfoBody, CreateCameraBody } from "../../validation/dto/camera.dto";
import { existCheck } from "../../validation/db";
import { CameraInfoKeys } from "../../types/interfaces/camera.interface";
import { create } from "../../db/mongo/create.database";
import { readMiddleware, readByIdMiddleware } from "../../db/mongo/read.database";
import { updateById } from "../../db/mongo/update.database";
import { deleteById } from "../../db/mongo/delete.database";
import { cameraInfo } from "../../tools/takeSnaphsot";
import { ApiError } from "../../types/classes/error.class";
import axios from "axios";

//create router for add to server
const router: Router = Router();

//add route for register new camera
router.post(
  "",
  dtoValidationMiddleware(CreateCameraBody, { skipMissingProperties: false, detailedMassage: false, info: "please fill all fields" }),
  existCheck(Camera, { $and: [{ ip: "ip" }, { nvr: "nvr" }], }, "Camera already exists!"),
  getStreamUri(CameraInfoKeys), //get live stream uri(rtsp link from camera)
  create(["section_id", "nvr", "ip", "name", "username", "password", "network", "is_enabled", "muted", "camera_type", "url"], Camera)
);

//route for get id camera with ip from back RTSPtoWEBRTC
router.post(
  "/getIdStream",
  //verify body request
  dtoValidationMiddleware(CameraInfoBody, { skipMissingProperties: false, detailedMassage: false, info: "please fill all fields" }),
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get jason from body request
      let cam_test = req.body; //cameraInfo

      //get live stream uri(rtsp link from camera)
      let stream_uri = await oldGetStreamUri(cam_test);
      if (stream_uri == undefined) {
        req.flash("error", "rtsp link not found");
        return next(new ApiError(400, "rtsp link not found"));
      }
      //get url AI for send request
      const rtsp_to_webrtc: string = process.env["WEB_STREAM"] as string;
      //send request to back RTSPtoWEBRTC api for send ip and get id
      const response = await axios.post(
        rtsp_to_webrtc,
        {
          ip: cam_test.ip,
          username: cam_test.username,
          password: cam_test.password,
          url: stream_uri,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.status === 200 && response.data != "") {
        //send response to client with camera
        return res.status(200).json({
          success: true,
          data: response.data,
        });
      } else {
        //send response to client with camera
        return res.status(response.status).json({
          success: false,
          data: "Not Found",
        });
      }
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  });

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
  updateById(Camera) // TODO: test for edit
);

//add route for delete camera
router.delete(
  "/:id",
  deleteById(Camera) // delete also triggers the remove post function of Camera schema
);

export default router;
