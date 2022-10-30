import { NextFunction, Router, Request, Response } from "express";
import { ApiError } from "../../error/error.handler";
import Camera from "../../models/camera";
import Personnel from "../../models/personnel";
import { io } from "../../server";
import Path from "path";
import Section from "../../models/section";
import Department from "../../models/department";
import Car from "../../models/car";
import ModelToCamera from "../../models/modelToCamera";
import Schedule from "../../models/schedule";
import recordStream from "../../tools/recordStream";

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

router.get("/", function (req: Request, res: Response, next: NextFunction) {
  let path = Path.join(__dirname, "./../../../index.html");
  res.sendFile(path);
});

//get alerts from back
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get jason from body request
    const bodyRequest = req.body;
    let _camera = await Camera.findById(bodyRequest.log.camera_id).exec();
    let _section;
    if (_camera) {
      _section = await Section.findById(_camera.section_id).exec();
    }
    let _departement;
    if (_section) {
      _departement = await Department.findById(_section.department_id).exec();
    }
    let _owner;
    if (bodyRequest.log.plate_number) {
      let ownerWithId = await Car.findOne({ number_plate: bodyRequest.log.plate_number }).exec();
      if (ownerWithId) {
        _owner = await Personnel.findById(ownerWithId.owner).exec();
      }
    }
    let _personnel;
    if (bodyRequest.log.personnel_id != null && isNaN(Number(bodyRequest.log.personnel_id))) {
      _personnel = await Personnel.findById(bodyRequest.log.personnel_id).exec();
    }

    let is_muted_list: boolean = false;
    if (bodyRequest.log.schedule_id) {
      let schedule = await Schedule.findById(bodyRequest.log.schedule_id).exec();
      let model_camera_id;
      if (schedule) {
        model_camera_id = await ModelToCamera.findById(schedule.model_camera_id).exec();
      }
      if (model_camera_id) {
        is_muted_list = _camera?.muted.includes(model_camera_id.model_id) ?? false;
      }
    }

    let result = {
      title: _personnel != null ? "Alerting" : "Warnings",
      type: bodyRequest.type,
      confidence: bodyRequest.log.confidence,
      camera: _camera?.name,
      section: _section?.name,
      departement: _departement?.name,
      personnel: _personnel?.first_name + " " + _personnel?.last_name,
      personnel_code: _personnel?.personnel_code,
      description: bodyRequest.description,
      time: bodyRequest.log.timestamp,
      peopleCounting: bodyRequest.log.number_of_people,
      plate_number: bodyRequest.log.plate_number,
      owner: _owner?.first_name + " " + _owner?.last_name,
    };

    let notification = result;
    const time_record_stream = Number(process.env["RECORD_STREAM_TIME"] as string);
    let rtsp_link_aray: string[] | undefined = _camera?.url.split(":");
    let rtsp_link: string = rtsp_link_aray ? rtsp_link_aray[0] + "://" + _camera?.username + ":" + _camera?.password + "@" + _camera?.ip + ":" + rtsp_link_aray[3] : "";
    let recorder: any = recordStream(rtsp_link, _camera?._id.toString());
    if (is_muted_list === false) {
      io.emit("get alert", notification);
      if (notification.title == "Alerting") {
        recorder.start();
        console.log("Recording has started.");

        setTimeout(() => {
          recorder.stop();
          console.log("Recording has stopped.");
        }, time_record_stream);
      }
    }

    return res.status(201).json({
      success: true,
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

export default router;
