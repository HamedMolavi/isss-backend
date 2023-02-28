import axios from "axios";
import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ApiError } from "../../error/error.handler";
import Model from "../../models/model";
import ModelToCamera from "../../models/modelToCamera";
import Schedule from "../../models/schedule";
import Camera, { ICamera } from "./../../models/camera";
//import { getTokenAndVerify } from "./../../tools/authentication";
import { CameraInfo, getStreamUri } from "../../tools/camera.tools";

//get user role from enviroment variable
const const_role = process.env.const_role || "user";

//create router for add to server
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

//add route for register new camera
router.post(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get jason from body request
      const {
        section_id,
        nvr,
        ip,
        name,
        username,
        password,
        network,
        is_enabled,
        muted,
      }: ICamera = req.body;
      //verify body request
      if (!section_id || !ip || !name || !username || !password || !network) {
        req.flash("error", "please complete all fields");
        return next(new ApiError(400, "please complete all fields"));
      }

      //get token from header request and verify
     // let token = getTokenAndVerify(req, const_role, next);
    //  if (!token) {
     //   return null;
     // }

      //query for save new Camera in DB
      let camera = await Camera.findOne({
        $or: [{ ip: ip }],
      }).exec();

      //return error if camera already exist
      if (camera) {
        req.flash("error", "camera already exist");
        return next(new ApiError(400, "camera already exist"));
      }

      let camInfo: CameraInfo = {
        ip: ip,
        username: username,
        password: password,
      };

      //get live stream uri(rtsp link from camera)
      let stream_uri = await getStreamUri(camInfo);
      if (stream_uri == undefined) {
        req.flash("error", "rtsp link not found");
        return next(new ApiError(400, "rtsp link not found"));
      }
      //fil new camera
      camera = new Camera({
        section_id: section_id,
        url: stream_uri,
        nvr: nvr,
        ip: ip,
        network: network,
        name: name,
        username: username,
        password: password,
        muted: muted,
        is_enabled: is_enabled,
      });

      //save camera in DB
      await camera.save();

      let models = await Model.find({}).exec();

      for (let i = 0; i < models.length; ++i) {
        let _model2CameraSave = new ModelToCamera({
          _id: new mongoose.Types.ObjectId(),
          model_id: models[i]._id,
          camera_id: camera._id,
          is_enabled: false,
        });
        await _model2CameraSave.save();
      }
      //return success
      req.flash("info", "camera added");
      return res.status(201).json({
        success: true,
        data: camera,
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
);

//route for get cameras list
router.get(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      let search = (req.query.search as string) || "";
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

      //get token from header request and verify
     // let token = getTokenAndVerify(req, const_role, next);
     // if (!token) {
     //   return null;
     // }
      let cameras: ICamera[] = [];
      //query for get cameras list
      if (search !== "") {
        cameras = await Camera.find({
          ip: { $regex: search, $options: "i" },
        })
          .skip((page - 1) * perPage)
          .limit(perPage)
          .exec();
      } else {
        cameras = await Camera.find({})
          .limit(perPage)
          .skip(perPage * (page - 1))
          .exec();
      }
      //return response not found to client if not found cameras
      if (!cameras) {
        req.flash("error", "Cameras not found");
        return next(new ApiError(404, "Cameras not found"));
      }

      //return response to client with departements list
      return res.status(200).json({
        success: true,
        data: cameras,
        page: page,
        perPage: perPage,
        total: await Camera.countDocuments().exec(),
        pages: Math.ceil((await Camera.countDocuments().exec()) / perPage),
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

//route for get id camera with ip from back RTSPtoWEBRTC
router.post(
  "/getIdStream",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get jason from body request
      let cam_test: CameraInfo = req.body;
      //verify body request
      if (!cam_test.ip || !cam_test.username || !cam_test.password) {
        req.flash("error", "please Ip and username and password");
        return next(new ApiError(400, "please Ip and username and password"));
      }

      //get token from header request and verify
     // let token = getTokenAndVerify(req, const_role, next);
     // if (!token) {
     //   return null;
     // }
      //get live stream uri(rtsp link from camera)
      let stream_uri = await getStreamUri(cam_test);
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
      console.log(response.data);      
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
  }
);

//route for get camera by id from DB
router.get(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from params in url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "id not found");
        return next({ status: 400, message: "Bad request" });
      }
      //get token from header request and verify
      //let token = getTokenAndVerify(req, const_role, next);
     // if (!token) {
     //   return null;
     // }

      //query for get camera by id from DB
      let camera = await Camera.findById(id).exec();

      //return error if camera not found
      if (!camera) {
        req.flash("error", "camera not found");
        return next(new ApiError(404, "camera not found"));
      }

      //send response to client with camera
      return res.status(200).json({
        success: true,
        data: camera,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

//add route for edit camera
router.patch(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "id not found");
        return next(new ApiError(400, "Bad request id not found"));
      }
      //get jason from body request
      const cameraBody = req.body;
      //get token from header request and verify
     // let token = getTokenAndVerify(req, const_role, next);
     // if (!token) {
     //   return null;
     // }
      //query for get user by id from DB
      let camera = await Camera.findByIdAndUpdate(id, cameraBody, {
        new: true,
      }).exec();
      //return error if user not found
      if (!camera) {
        req.flash("error", "camera not found");
        return next(new ApiError(404, "camera not found"));
      }
      //send response to client with user
      return res.status(201).json({
        success: true,
        data: camera,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

//add route for delete camera
router.delete(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id = req.params.id;
      if (!id) {
        return next(new ApiError(400, "Bad request id not found"));
      }

      //get token from header request and verify
     // let token = getTokenAndVerify(req, const_role, next);
     // if (!token) {
     //   return null;
     // }

      //query for get camera by username from DB
      let camera = await Camera.findByIdAndDelete(id).exec();
      //return error if camera not found
      if (!camera) {
        req.flash("error", "camera not found");
        return next(new ApiError(404, "camera not found"));
      }
      let model_to_camera = await ModelToCamera.find({
        camera_id: camera._id,
      }).exec();
      if (model_to_camera) {
        for (let model of model_to_camera) {
          let schedule = await Schedule.findOneAndDelete({
            model_camera_id: model._id,
          }).exec();
        }
        let model_to_camera_deleted = await ModelToCamera.deleteMany({
          camera_id: camera._id,
        }).exec();
      }
      //send response to client with camera
      return res.status(201).json({
        success: true,
        data: camera,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

export default router;
