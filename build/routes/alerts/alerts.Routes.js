"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const error_handler_1 = require("../../error/error.handler");
const camera_1 = __importDefault(require("../../models/camera"));
const personnel_1 = __importDefault(require("../../models/personnel"));
const server_1 = require("../../server");
const department_1 = __importDefault(require("../../models/department"));
const car_1 = __importDefault(require("../../models/car"));
const schedule_1 = __importDefault(require("../../models/schedule"));
const recordStream_1 = __importDefault(require("../../tools/recordStream"));
const sendSms_1 = require("../../tools/sendSms");
const notification_1 = __importDefault(require("../../models/notification"));
const sendEmail_1 = require("../../tools/sendEmail");
//get user role from enviroment variable
const const_role = process.env.const_role || "user";
//create router for add to server
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
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
//var Log_Alert: any = [["test", "schedule_id", "confidence", "camera_id", "personnel", "description", "peopleCounting", "plate_number"]];
//for limit record stream
var Camera_Is_Record = [];
//get alerts from back
router.post("", function (req, res, next) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const bodyRequest = req.body;
            if (!((_a = bodyRequest === null || bodyRequest === void 0 ? void 0 : bodyRequest.log) === null || _a === void 0 ? void 0 : _a.camera_id)) {
                return next(new error_handler_1.ApiError(500, "not found camrea_id"));
            }
            //get camera from DB and relational section
            let _camera = yield camera_1.default.findById(bodyRequest.log.camera_id).populate("section_id").exec();
            let _departement;
            if (_camera === null || _camera === void 0 ? void 0 : _camera.section_id) {
                _departement = yield department_1.default.findById(_camera === null || _camera === void 0 ? void 0 : _camera.section_id.department_id).exec(); //get departemant with section_id
            }
            //get plate and owner from DB
            let _owner;
            if (bodyRequest.log.plate_number) {
                _owner = yield car_1.default.findOne({ number_plate: bodyRequest.log.plate_number }).populate("owner").exec();
            }
            let _personnel;
            if (bodyRequest.log.personnel_id != null && isNaN(Number(bodyRequest.log.personnel_id))) {
                _personnel = yield personnel_1.default.findById(bodyRequest.log.personnel_id).exec(); //get personnel with perssonel_id
            }
            let is_muted_list = false;
            if (bodyRequest.log.schedule_id) {
                let schedule = yield schedule_1.default.findById(bodyRequest.log.schedule_id).populate("model_camera_id").exec(); //get schedule from DB with id
                if (schedule === null || schedule === void 0 ? void 0 : schedule.model_camera_id) {
                    is_muted_list = (_c = _camera === null || _camera === void 0 ? void 0 : _camera.muted.includes((_b = schedule === null || schedule === void 0 ? void 0 : schedule.model_camera_id) === null || _b === void 0 ? void 0 : _b.model_id)) !== null && _c !== void 0 ? _c : false; //check camera is muted or not
                }
            }
            //create json for send to client
            let result = {
                title: _personnel != null ? "Alerting" : "Warnings",
                type: bodyRequest.type,
                confidence: bodyRequest.log.confidence,
                camera: _camera === null || _camera === void 0 ? void 0 : _camera.name,
                camera_id: _camera === null || _camera === void 0 ? void 0 : _camera._id.toString(),
                section: (_d = _camera === null || _camera === void 0 ? void 0 : _camera.section_id) === null || _d === void 0 ? void 0 : _d.name,
                departement: _departement === null || _departement === void 0 ? void 0 : _departement.name,
                personnel: (_personnel === null || _personnel === void 0 ? void 0 : _personnel.first_name) + " " + (_personnel === null || _personnel === void 0 ? void 0 : _personnel.last_name),
                personnel_code: _personnel === null || _personnel === void 0 ? void 0 : _personnel.personnel_code,
                description: bodyRequest.description,
                time: bodyRequest.log.timestamp,
                peopleCounting: bodyRequest.log.number_of_people,
                plate_number: bodyRequest.log.plate_number,
                owner: ((_e = _owner === null || _owner === void 0 ? void 0 : _owner.owner) === null || _e === void 0 ? void 0 : _e.first_name) + " " + ((_f = _owner === null || _owner === void 0 ? void 0 : _owner.owner) === null || _f === void 0 ? void 0 : _f.last_name),
            };
            //add to global list alerting for not send more then one notif
            //and filter old list to new alert
            // let x = bodyRequest.log.personnel_id || bodyRequest.log.plate_number || bodyRequest.log.number_of_people || "";
            // let temp: string[] = [
            //   result.type ?? "",
            //   bodyRequest.log.schedule_id ?? "",
            //   result.camera_id ?? "",
            //   result.personnel ?? "",
            //   result.description ?? "",
            //   result.peopleCounting ?? "",
            //   result.plate_number ?? "",
            // ];
            // let send_notif: boolean = false;
            // let new_notif: boolean = false;
            // let i = 0;
            // for (let item of Log_Alert) {
            //   let is_log_before =
            //     temp.length === item[0].length &&
            //     temp.every(function (value, index) {
            //       return value === item[0][index];
            //     });
            //   if (is_log_before) {
            //     send_notif = false;
            //     break;
            //   }
            //   send_notif = true;
            // }
            // if (send_notif) {
            //   Log_Alert.push([temp]);
            // }
            let notification = result;
            //get time for record from .env
            const time_record_stream = Number(process.env["RECORD_STREAM_TIME"]);
            //create rtsp link
            let rtsp_link_aray = _camera === null || _camera === void 0 ? void 0 : _camera.url.split(":");
            let rtsp_link = rtsp_link_aray ? rtsp_link_aray[0] + "://" + (_camera === null || _camera === void 0 ? void 0 : _camera.username) + ":" + (_camera === null || _camera === void 0 ? void 0 : _camera.password) + "@" + (_camera === null || _camera === void 0 ? void 0 : _camera.ip) + ":" + rtsp_link_aray[3] : "";
            //create new recorder
            let recorder = (0, recordStream_1.default)(rtsp_link, _camera === null || _camera === void 0 ? void 0 : _camera._id.toString());
            //if (is_muted_list === false && send_notif == true) {
            if (is_muted_list === false) {
                server_1.io.emit("get alert", notification); //send notif to client with socket.io
                //check for limit record camera to 3 and camera in not recording
                let temp_record = [bodyRequest.log.camera_id, bodyRequest.log.schedule_id];
                let isOpenForRecord = false;
                for (let cam of Camera_Is_Record) {
                    if (cam[0].includes(result.camera_id)) {
                        isOpenForRecord = true;
                        break;
                    }
                }
                if (notification.title == "Alerting" && Camera_Is_Record.length < 3 && !isOpenForRecord) {
                    //recorder.start(); //start recording
                    console.log("Recording has started.");
                    Camera_Is_Record.push([temp_record]); //add camera_id to global list for limiting record
                    //stop record and delete item from global list limit record ==> Camera_Is_Record
                    setTimeout(() => {
                        //recorder.stop();
                        console.log("Recording has stopped.");
                        Camera_Is_Record = Camera_Is_Record.filter((item) => {
                            if (bodyRequest.log.schedule_id != item[0][1]) {
                                return item;
                            }
                        });
                    }, time_record_stream);
                }
                // setTimeout(() => {
                //   if (Log_Alert.length > 250) {
                //     //ckeck for empety memory
                //     Log_Alert = [["test", "schedule_id", "confidence", "camera_id", "personnel", "description", "peopleCounting", "plate_number"]];
                //   }
                //   //update global list alerting
                //   Log_Alert = Log_Alert.filter((item: any) => {
                //     let is_log_before =
                //       temp.length === item[0].length &&
                //       temp.every(function (value, index) {
                //         return value === item[0][index];
                //       });
                //     if (!is_log_before) {
                //       return item[0];
                //     }
                //   });
                // }, 20000);
            }
            //get all notification for send email or sms
            let notifications = yield notification_1.default.find().exec(); //query for get all notification
            for (let notif of notifications) {
                if (!notif.sms_enable) {
                    continue;
                }
                if (!notif.bypass_time) {
                    continue;
                }
                let time = new Date(Date.now());
                let time_is = time.getHours() + ":" + time.getMinutes();
                if (notif.time_start < time_is && notif.time_end > time_is) {
                    continue;
                }
                if (notif.cameras.includes(result.camera_id)) {
                    //send sms
                    if (notif.phone_number) {
                        (0, sendSms_1.send_sms)(notif.phone_number, result.description);
                    }
                    if (notif.email) {
                        (0, sendEmail_1.send_email)(notif.email, result.description);
                    }
                }
            }
            //send response to client
            return res.status(201).json({
                success: true,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
exports.default = router;
