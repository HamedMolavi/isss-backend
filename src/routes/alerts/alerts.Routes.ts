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

//return html file for test socket.io
// router.get("/", function (req: Request, res: Response, next: NextFunction) {
//   let path = Path.join(__dirname, "./../../../index.html");
//   res.sendFile(path);
// });

//define variable for filter log and block log
var Log_Alert: any = [];
//for limit record stream
var Camera_Is_Record: any = [];

//get alerts from back
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get jason from body request
    const bodyRequest = req.body;
    if (!bodyRequest?.log?.camera_id) {
      return next(new ApiError(500, "not found camrea_id"));
    }
    //get camera from DB and relational section
    let _camera: any = await Camera.findById(bodyRequest.log.camera_id).populate("section_id").exec();
    let _departement;
    if (_camera?.section_id) {
      _departement = await Department.findById(_camera?.section_id.department_id).exec();//get departemant with section_id
    }
    //get plate and owner from DB 
    let _owner: any;
    if (bodyRequest.log.plate_number) {
      _owner = await Car.findOne({ number_plate: bodyRequest.log.plate_number }).populate("owner").exec();
    }
    let _personnel;
    if (bodyRequest.log.personnel_id != null && isNaN(Number(bodyRequest.log.personnel_id))) {
      _personnel = await Personnel.findById(bodyRequest.log.personnel_id).exec();//get personnel with perssonel_id
    }

    let is_muted_list: boolean = false;
    if (bodyRequest.log.schedule_id) {
      let schedule: any = await Schedule.findById(bodyRequest.log.schedule_id).populate("model_camera_id").exec();//get schedule from DB with id
      if (schedule?.model_camera_id) {
        is_muted_list = _camera?.muted.includes(schedule?.model_camera_id?.model_id) ?? false; //check camera is muted or not
      }
    }
    //create json for send to client
    let result = {
      title: _personnel != null ? "Alerting" : "Warnings",
      type: bodyRequest.type,
      confidence: bodyRequest.log.confidence,
      camera: _camera?.name,
      camera_id: _camera?._id.toString(),
      section: _camera?.section_id?.name,
      departement: _departement?.name,
      personnel: _personnel?.first_name + " " + _personnel?.last_name,
      personnel_code: _personnel?.personnel_code,
      description: bodyRequest.description,
      time: bodyRequest.log.timestamp,
      peopleCounting: bodyRequest.log.number_of_people,
      plate_number: bodyRequest.log.plate_number,
      owner: _owner?.owner?.first_name + " " + _owner?.owner?.last_name,
    };

    //add to global list alerting for not send more then one notif
    //and filter old list to new alert
    let temp: string[] = [result.time, result.camera_id, bodyRequest.log.schedule_id];
    let send_notif: boolean = false;
    if (Log_Alert.length == 0) {
      Log_Alert.push([temp]);
      send_notif = true;
    } else if (Log_Alert.length) {
      for (let item of Log_Alert) {
        if (result.camera_id == item[0][1] && bodyRequest.log.schedule_id == item[0][2]) {
          if (result.time - item[0][0] > 10000) {
            send_notif = true;
            break;
          } else {
            break;
          }
        }
      }
    }

    let notification = result;
    //get time for record from .env
    const time_record_stream = Number(process.env["RECORD_STREAM_TIME"] as string);
    //create rtsp link 
    let rtsp_link_aray: string[] | undefined = _camera?.url.split(":");
    let rtsp_link: string = rtsp_link_aray ? rtsp_link_aray[0] + "://" + _camera?.username + ":" + _camera?.password + "@" + _camera?.ip + ":" + rtsp_link_aray[3] : "";
    //create new recorder
    let recorder: any = recordStream(rtsp_link, _camera?._id.toString());
    if (is_muted_list === false && send_notif == true) {
      io.emit("get alert", notification);//send notif to client with socket.io
      //check for limit record camera to 3 and camera in not recording
      if (notification.title == "Alerting" && Camera_Is_Record.length < 3 && !Camera_Is_Record.includes(notification.camera_id)) {
        recorder.start();//start recording 
        console.log("Recording has started.");
        Camera_Is_Record.push([notification.camera_id, bodyRequest.log.schedule_id]);//add camera_id to global list for limiting record
        //stop record and delete item from global list limit record ==> Camera_Is_Record
        setTimeout(() => {
          recorder.stop();
          console.log("Recording has stopped.");
          Camera_Is_Record = Camera_Is_Record.filter((item: any) => {
            if (notification.camera_id != item[1]) {
              return item;
            }
          });
        }, time_record_stream);
      }
    }
    if (Log_Alert.length > 250) {//ckeck for empety memory
      Log_Alert = [];
    } else {
      //update global list alerting 
      Log_Alert = Log_Alert.map((item: any) => {
        if (result.camera_id != item[1] && bodyRequest.log.schedule_id != item[2]) {
          return item;
        }
        return [bodyRequest.log.timestamp, item[0][1], bodyRequest.log.schedule_id];
      });
    }
    //send response to client
    return res.status(201).json({
      success: true,
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

export default router;
