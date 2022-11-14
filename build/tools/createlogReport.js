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
exports.eventDepartmentLogResponse = exports.eventLogResponse = exports.faceLogResponse = exports.fireLogResponse = exports.humanLogResponse = exports.plateLogResponse = exports.sabotageLogResponse = void 0;
const camera_1 = __importDefault(require("../models/camera"));
const car_1 = __importDefault(require("../models/car"));
const carBrand_1 = __importDefault(require("../models/carBrand"));
const carColor_1 = __importDefault(require("../models/carColor"));
const personnel_1 = __importDefault(require("../models/personnel"));
const schedule_1 = __importDefault(require("../models/schedule"));
const modelToCamera_1 = __importDefault(require("../models/modelToCamera"));
const section_1 = __importDefault(require("../models/section"));
const department_1 = __importDefault(require("../models/department"));
const EnglishToPersianPlate_1 = __importDefault(require("./EnglishToPersianPlate"));
const model_1 = __importDefault(require("../models/model"));
const fs_1 = __importDefault(require("fs"));
const getPathFromIdTiem_1 = require("./getPathFromIdTiem");
//create json response sabotageLog report for send to client
function sabotageLogResponse(response, time_start, time_end) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        let cameras = yield camera_1.default.find().exec();
        for (let log of response.data.hits.hits) {
            let time = new Date(log._source.timestamp);
            if (time_start && time_end && (time.toTimeString() < time_start || time.toTimeString() > time_end)) {
                continue;
            }
            let result = {
                camera_id: log._source.camera_id,
                camera: (_b = (_a = cameras.find((cam) => {
                    if (cam._id == log._source.camera_id)
                        return cam.name;
                })) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
                time: time.toLocaleString(),
            };
            _data.push(result);
        }
        return _data;
    });
}
exports.sabotageLogResponse = sabotageLogResponse;
//create json response plateLog report for send to client
function plateLogResponse(response, carBrand, carColor, owner, allowed, search, time_start, time_end) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        let cars;
        if (owner && carColor && carBrand) {
            cars = yield car_1.default.find({
                $or: [{ owner: { $in: owner } }, { color_id: { $in: carColor } }, { brand_id: { $in: carBrand } }],
            }).exec();
        }
        else {
            //send error if owner or color or brand is not found in DB
            cars = yield car_1.default.find({}).exec();
        }
        let cameras = yield camera_1.default.find().exec();
        let personnels = yield personnel_1.default.find().exec();
        let colors = yield carColor_1.default.find().exec();
        let brands = yield carBrand_1.default.find().exec();
        //get cars with match plate_number from elastic search to cars plate_number
        let _data = [];
        //create json response
        for (let log of response.data.hits.hits) {
            let time = new Date(log._source.timestamp);
            if (time_start && time_end && (time.toTimeString() < time_start || time.toTimeString() > time_end)) {
                continue;
            }
            //split plate_number to get first and last digit
            //change plate number format from english to persian
            let plateNumber1 = Number(log._source.plate_number.substr(0, 2)).toLocaleString("fa-IR");
            let plateNumber2 = log._source.plate_number.substr(2, 1);
            let plateNumber3 = Number(log._source.plate_number.substr(3, 3)).toLocaleString("fa-IR");
            let plateNumber4 = Number(log._source.plate_number.substr(6, 2)).toLocaleString("fa-IR");
            //add plate number to json response for sort persian format in font end
            let plateNumber = {
                first: plateNumber1,
                second: EnglishToPersianPlate_1.default[plateNumber2],
                third: plateNumber3,
                fourth: "ایران",
                fifth: plateNumber4,
            };
            //define json for add in list response data
            let result = {
                camera_id: log._source.camera_id,
                camera: (_b = (_a = cameras.find((cam) => {
                    if (cam._id == log._source.camera_id)
                        return cam.name;
                })) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
                time: time.toLocaleString(),
                plate_number: plateNumber,
                owner: "",
                color: "",
                brand: "",
                allowed: false,
            };
            //get compare plate_number from elastic search to cars plate_number and get owner, color, brand fore search api
            for (let car of cars) {
                if (log._source.plate_number === car.number_plate) {
                    //get owner from DB and set to result
                    let _personnel = personnels.find((person) => {
                        if (person._id == car.owner)
                            return person;
                    });
                    result.owner = _personnel != null ? (_personnel === null || _personnel === void 0 ? void 0 : _personnel.first_name) + " " + (_personnel === null || _personnel === void 0 ? void 0 : _personnel.last_name) : "null";
                    //get color from DB and set to result
                    (result.color =
                        (_d = (_c = colors.find((col) => {
                            if (col._id == car.color)
                                return col.name;
                        })) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : "null"),
                        //get brand from DB and set to result
                        (result.brand =
                            (_f = (_e = brands.find((bra) => {
                                if (bra._id == car.brand)
                                    return bra.name;
                            })) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : "null"),
                        (result.allowed = car.camera_whitelist.includes(log._source.camera_id) ? true : false);
                }
            }
            //if car not found in DB and request for all log report then add plate without owner
            if (search && result.allowed == allowed) {
                _data.push(result);
            }
            else if (search == false) {
                _data.push(result);
            }
        }
        return _data;
    });
}
exports.plateLogResponse = plateLogResponse;
//create json response humanLog report for send to client
function humanLogResponse(response, allowed, search, time_start, time_end) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        //let modelToCameras = await ModelToCamera.find().exec();
        let schedules = yield schedule_1.default.find().exec();
        let cameras = yield camera_1.default.find().exec();
        for (let log of response.data.hits.hits) {
            let time = new Date(log._source.timestamp);
            if (time_start && time_end && (time.toTimeString() < time_start || time.toTimeString() > time_end)) {
                continue;
            }
            let _schedule = schedules.find((item) => {
                if (item._id == log.schedule_id)
                    return item;
            });
            let result = {
                camera_id: log._source.camera_id,
                camera: (_b = (_a = cameras.find((cam) => {
                    if (cam._id == log._source.camera_id)
                        return cam.name;
                })) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
                time: time.toLocaleString(),
                numberOfPeople: log._source.number_of_people,
                allowed: (_c = (_schedule && _schedule.config.max_people >= log._source.number_of_people && _schedule.config.min_people <= log._source.number_of_people)) !== null && _c !== void 0 ? _c : false,
            };
            if (search && result.allowed == allowed) {
                _data.push(result);
            }
            else if (search == false) {
                _data.push(result);
            }
        }
        return _data;
    });
}
exports.humanLogResponse = humanLogResponse;
//create json response fireLog report for send to client
function fireLogResponse(response, time_start, time_end) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        let cameras = yield camera_1.default.find().exec();
        for (let log of response.data.hits.hits) {
            let time = new Date(log._source.timestamp);
            if (time_start && time_end && (time.toTimeString() < time_start || time.toTimeString() > time_end)) {
                continue;
            }
            let result = {
                camera_id: log._source.camera_id,
                camera: (_b = (_a = cameras.find((cam) => {
                    if (cam._id == log._source.camera_id)
                        return cam.name;
                })) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
                time: time.toLocaleString(),
                probability: log._source.confidence,
            };
            _data.push(result);
        }
        return _data;
    });
}
exports.fireLogResponse = fireLogResponse;
//create json response faceLog report for send to client
function faceLogResponse(response, allowed, search, time_start, time_end) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        let cameras = yield camera_1.default.find().exec();
        let personnels = yield personnel_1.default.find().exec();
        for (let log of response.data.hits.hits) {
            let time = new Date(log._source.timestamp);
            if (time_start && time_end && (time.toTimeString() < time_start || time.toTimeString() > time_end)) {
                continue;
            }
            let _personnel = personnels.find((person) => {
                if (log._source.personnel_id == person._id) {
                    return person.first_name + " " + person.last_name;
                }
            });
            let result = {
                camera_id: log._source.camera_id,
                camera: (_b = (_a = cameras.find((cam) => {
                    if (cam._id == log._source.camera_id)
                        return cam.name;
                })) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
                fullName: _personnel != null ? (_personnel === null || _personnel === void 0 ? void 0 : _personnel.first_name) + " " + (_personnel === null || _personnel === void 0 ? void 0 : _personnel.last_name) : "",
                time: time.toLocaleString(),
                allowed: (_c = _personnel === null || _personnel === void 0 ? void 0 : _personnel.camera_whitelist.includes(log._source.camera_id)) !== null && _c !== void 0 ? _c : false,
            };
            if (search && result.allowed == allowed) {
                _data.push(result);
            }
            else if (search == false) {
                _data.push(result);
            }
        }
        return _data;
    });
}
exports.faceLogResponse = faceLogResponse;
//create json response eventLog report for send to client
function eventLogResponse(response, time_start, time_end) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        const dbUri = process.env["BASE_URL"];
        //create json response
        let _data = [];
        let cameras = yield camera_1.default.find().exec();
        let schedules = yield schedule_1.default.find().exec();
        let models = yield model_1.default.find().exec();
        let modelToCameras = yield modelToCamera_1.default.find().exec();
        let sections = yield section_1.default.find().exec();
        let departments = yield department_1.default.find().exec();
        for (let log of response.data.hits.hits) {
            //convert time from epoch to date for get path video
            let time = new Date(log._source.timestamp);
            if (time_start && time_end && (time.toTimeString() < time_start || time.toTimeString() > time_end)) {
                continue;
            }
            const videoPath = (0, getPathFromIdTiem_1.getPathFromIdTime)(log._source.log.timestamp, log._source.log.camera_id.toString());
            let existVideo = false;
            if (videoPath !== "" && fs_1.default.existsSync(videoPath)) {
                existVideo = true;
            }
            let schedule = schedules.find((sche) => {
                if (log._source.log.schedule_id.toString() == sche._id.toString())
                    return sche;
            });
            let modelToCamera = modelToCameras.find((mod2cam) => {
                if ((schedule === null || schedule === void 0 ? void 0 : schedule.model_camera_id.toString()) == mod2cam._id.toString()) {
                    return mod2cam;
                }
            });
            let _model = models.find((mod) => {
                if ((modelToCamera === null || modelToCamera === void 0 ? void 0 : modelToCamera.model_id.toString()) == mod._id.toString())
                    return mod;
            });
            let result = {
                type: log._source.type,
                cause: log._source.cause,
                camera_id: log._source.log.camera_id,
                name: (_b = (_a = cameras.find((cam) => {
                    if (cam._id.toString() == log._source.log.camera_id.toString())
                        return cam;
                })) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
                time: time.toLocaleString(),
                ai: _model != undefined ? _model.category : "",
                section: (_d = (_c = sections.find((sec) => {
                    let camera = cameras.find((cam) => {
                        if (cam._id.toString() == log._source.log.camera_id.toString())
                            return cam;
                    });
                    if ((camera === null || camera === void 0 ? void 0 : camera.section_id.toString()) == sec._id.toString()) {
                        return sec;
                    }
                })) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : "",
                department: (_f = (_e = departments.find((dep) => {
                    let _camera = cameras.find((cam) => {
                        if (cam._id.toString() == log._source.log.camera_id.toString())
                            return cam;
                    });
                    let _section = sections.find((sec) => {
                        if (sec._id.toString() == (_camera === null || _camera === void 0 ? void 0 : _camera.section_id.toString()))
                            return sec;
                    });
                    if ((_section === null || _section === void 0 ? void 0 : _section.department_id.toString()) == dep._id.toString()) {
                        return dep;
                    }
                })) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : "",
                description: log._source.description,
                video: existVideo ? "http://" + dbUri + "/downloadVideo/" + log._source.log.camera_id + "." + log._source.log.timestamp : "",
            };
            _data.push(result);
        }
        return _data;
    });
}
exports.eventLogResponse = eventLogResponse;
//create json response eventLog report for send to client
function eventDepartmentLogResponse(response) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        let cameraIds = [];
        for (let i = 0; i < response.data.hits.hits[0]._source.alerts.length; i++) {
            //get camera from mongo db by id for get camera name
            if (cameraIds.includes(response.data.hits.hits[0]._source.alerts[i].labels.camera_id)) {
                continue;
            }
            else {
                cameraIds.push(response.data.hits.hits[0]._source.alerts[i].labels.camera_id);
                let camera = yield camera_1.default.findById(response.data.hits.hits[0]._source.alerts[i].labels.camera_id).exec();
                //let cameras = await Camera.find({ section_id: camera?.section_id }).exec();
                let sections = yield section_1.default.find({
                    section_id: camera === null || camera === void 0 ? void 0 : camera.section_id,
                }).exec();
                let department = yield department_1.default.findById((_a = sections[0]) === null || _a === void 0 ? void 0 : _a.department_id).exec();
                let result = {
                    department: department === null || department === void 0 ? void 0 : department.name,
                    sections: sections,
                    time: new Date(response.data.hits.hits[0]._source.alerts[i].labels.timestamp),
                    AI: response.data.hits.hits[0]._source.alerts[i].labels.module,
                    description: response.data.hits.hits[0]._source.alerts[i].annotations.description,
                };
                _data.push(yield result);
            }
        }
        return _data;
    });
}
exports.eventDepartmentLogResponse = eventDepartmentLogResponse;
