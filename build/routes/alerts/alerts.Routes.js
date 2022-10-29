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
const path_1 = __importDefault(require("path"));
const section_1 = __importDefault(require("../../models/section"));
const department_1 = __importDefault(require("../../models/department"));
const car_1 = __importDefault(require("../../models/car"));
const modelToCamera_1 = __importDefault(require("../../models/modelToCamera"));
const schedule_1 = __importDefault(require("../../models/schedule"));
const recordStream_1 = __importDefault(require("../../tools/recordStream"));
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
router.get("/", function (req, res, next) {
    let path = path_1.default.join(__dirname, "./../../../index.html");
    res.sendFile(path);
});
//get alerts from back
router.post("", function (req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const bodyRequest = req.body;
            let _camera = yield camera_1.default.findById(bodyRequest.log.camera_id).exec();
            let _section;
            if (_camera) {
                _section = yield section_1.default.findById(_camera.section_id).exec();
            }
            let _departement;
            if (_section) {
                _departement = yield department_1.default.findById(_section.department_id).exec();
            }
            let _owner;
            if (bodyRequest.log.plate_number) {
                let ownerWithId = yield car_1.default.findOne({ number_plate: bodyRequest.log.plate_number }).exec();
                if (ownerWithId) {
                    _owner = yield personnel_1.default.findById(ownerWithId.owner).exec();
                }
            }
            let _personnel;
            if (bodyRequest.log.personnel_id != null && isNaN(Number(bodyRequest.log.personnel_id))) {
                _personnel = yield personnel_1.default.findById(bodyRequest.log.personnel_id).exec();
            }
            let is_muted_list = false;
            if (bodyRequest.log.schedule_id) {
                let schedule = yield schedule_1.default.findById(bodyRequest.log.schedule_id).exec();
                let model_camera_id;
                if (schedule) {
                    model_camera_id = yield modelToCamera_1.default.findById(schedule.model_camera_id).exec();
                }
                if (model_camera_id) {
                    is_muted_list = (_a = _camera === null || _camera === void 0 ? void 0 : _camera.muted.includes(model_camera_id.model_id)) !== null && _a !== void 0 ? _a : false;
                }
            }
            let result = {
                title: _personnel != null ? "Alerting" : "Warnings",
                type: bodyRequest.type,
                confidence: bodyRequest.log.confidence,
                camera: _camera === null || _camera === void 0 ? void 0 : _camera.name,
                section: _section === null || _section === void 0 ? void 0 : _section.name,
                departement: _departement === null || _departement === void 0 ? void 0 : _departement.name,
                personnel: (_personnel === null || _personnel === void 0 ? void 0 : _personnel.first_name) + " " + (_personnel === null || _personnel === void 0 ? void 0 : _personnel.last_name),
                personnel_code: _personnel === null || _personnel === void 0 ? void 0 : _personnel.personnel_code,
                description: bodyRequest.description,
                time: bodyRequest.log.timestamp,
                peopleCounting: bodyRequest.log.number_of_people,
                plate_number: bodyRequest.log.plate_number,
                owner: (_owner === null || _owner === void 0 ? void 0 : _owner.first_name) + " " + (_owner === null || _owner === void 0 ? void 0 : _owner.last_name),
            };
            let notification = result;
            const time_record_stream = Number(process.env["RECORD_STREAM_TIME"]);
            let rtsp_link_aray = _camera === null || _camera === void 0 ? void 0 : _camera.url.split(":");
            let rtsp_link = rtsp_link_aray ? rtsp_link_aray[0] + "://" + (_camera === null || _camera === void 0 ? void 0 : _camera.username) + ":" + (_camera === null || _camera === void 0 ? void 0 : _camera.password) + "@" + (_camera === null || _camera === void 0 ? void 0 : _camera.ip) + ":" + rtsp_link_aray[3] : "";
            let recorder = (0, recordStream_1.default)(rtsp_link, _camera === null || _camera === void 0 ? void 0 : _camera._id.toString());
            if (is_muted_list === false) {
                server_1.io.emit("get alert", notification);
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
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
exports.default = router;
