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
//create json response sabotageLog report for send to client
function sabotageLogResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            //get camera from mongo db by id for get camera name
            let camera = yield camera_1.default.findById(response.data.hits.hits[i]._source.camera_id).exec();
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera === null || camera === void 0 ? void 0 : camera.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp),
            };
            _data.push(yield result);
        }
        return _data;
    });
}
exports.sabotageLogResponse = sabotageLogResponse;
//create json response plateLog report for send to client
function plateLogResponse(response, carBrand, carColor, owner, allowed, search) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        //query for get cars from mongo db with list color and list brand and list owner
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
        //get cars with match plate_number from elastic search to cars plate_number
        let _data = [];
        //create json response
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            //split plate_number to get first and last digit
            //change plate number format from english to persian
            let plateNumber1 = Number(response.data.hits.hits[i]._source.plate_number.substr(0, 2)).toLocaleString("fa-IR");
            let plateNumber2 = response.data.hits.hits[i]._source.plate_number.substr(2, 1);
            let plateNumber3 = Number(response.data.hits.hits[i]._source.plate_number.substr(3, 3)).toLocaleString("fa-IR");
            let plateNumber4 = Number(response.data.hits.hits[i]._source.plate_number.substr(6, 2)).toLocaleString("fa-IR");
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
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: (_a = (yield camera_1.default.findById(response.data.hits.hits[i]._source.camera_id).then((camera) => {
                    return camera === null || camera === void 0 ? void 0 : camera.name;
                }))) !== null && _a !== void 0 ? _a : "null",
                time: new Date(response.data.hits.hits[i]._source.timestamp),
                plate_number: plateNumber,
                owner: "",
                color: "",
                brand: "",
                allowed: false,
            };
            //get compare plate_number from elastic search to cars plate_number and get owner, color, brand fore search api
            for (let j = 0; j < cars.length; j++) {
                if (response.data.hits.hits[i]._source.plate_number === cars[j].number_plate) {
                    //get owner from DB and set to result
                    result.owner =
                        (_b = (yield personnel_1.default.findById(cars[j].owner)
                            .exec()
                            .then((personnel) => {
                            return (personnel === null || personnel === void 0 ? void 0 : personnel.first_name) + " " + (personnel === null || personnel === void 0 ? void 0 : personnel.last_name);
                        }))) !== null && _b !== void 0 ? _b : "null";
                    //get color from DB and set to result
                    result.color =
                        (_c = (yield carColor_1.default.findById(cars[j].color_id)
                            .exec()
                            .then((carColor) => {
                            return carColor === null || carColor === void 0 ? void 0 : carColor.name;
                        }))) !== null && _c !== void 0 ? _c : "null";
                    //get brand from DB and set to result
                    result.brand =
                        (_d = (yield carBrand_1.default.findById(cars[j].brand_id)
                            .exec()
                            .then((car) => {
                            return car === null || car === void 0 ? void 0 : car.name;
                        }))) !== null && _d !== void 0 ? _d : "null";
                    //set allowed to result if car is allowed or not
                    if (allowed === null) {
                        result.allowed = cars[j].camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) ? true : false;
                    }
                    else if (cars[j].camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) !== allowed) {
                        break;
                    }
                    else if (cars[j].camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) === allowed) {
                        result.allowed = allowed;
                    }
                    _data.push(result);
                    break;
                }
            }
            //if car not found in DB and request for all log report then add plate without owner
            if (!search) {
                _data.push(result);
            }
        }
        return _data;
    });
}
exports.plateLogResponse = plateLogResponse;
//create json response humanLog report for send to client
function humanLogResponse(response, allowed) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            //get modelToCamera from mongo db by id
            let model2camera = yield modelToCamera_1.default.findOne({
                camera_id: response.data.hits.hits[i]._source.camera_id,
            }).exec();
            //get schedule from mongo db by model_camera_id for compare with max_people
            let schedule = yield schedule_1.default.findOne({
                model_camera_id: model2camera === null || model2camera === void 0 ? void 0 : model2camera._id.toString(),
            }).exec();
            //get camera from mongo db by id for get camera name
            let camera = yield camera_1.default.findById(response.data.hits.hits[i]._source.camera_id).exec();
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera === null || camera === void 0 ? void 0 : camera.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp),
                numberOfPeople: response.data.hits.hits[i]._source.number_of_people,
                allowed: false,
            };
            if (allowed === null
            // schedule!?.config!?.max_people! >=
            //   response.data.hits.hits[i].number_of_people ==
            //   allowed
            ) {
                result.allowed = ((_a = schedule === null || schedule === void 0 ? void 0 : schedule.config) === null || _a === void 0 ? void 0 : _a.max_people) >= response.data.hits.hits[i].number_of_people ? true : false;
            }
            else if (((_b = schedule === null || schedule === void 0 ? void 0 : schedule.config) === null || _b === void 0 ? void 0 : _b.max_people) >= response.data.hits.hits[i].number_of_people === allowed) {
                result.allowed = allowed;
            }
            else if (((_c = schedule === null || schedule === void 0 ? void 0 : schedule.config) === null || _c === void 0 ? void 0 : _c.max_people) >= response.data.hits.hits[i].number_of_people === allowed) {
                break;
            }
            _data.push(yield result);
        }
        return _data;
    });
}
exports.humanLogResponse = humanLogResponse;
//create json response fireLog report for send to client
function fireLogResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            //get camera from mongo db by id for get camera name
            let camera = yield camera_1.default.findById(response.data.hits.hits[i]._source.camera_id).exec();
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera === null || camera === void 0 ? void 0 : camera.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp),
                probability: response.data.hits.hits[i]._source.confidence,
            };
            _data.push(yield result);
        }
        return _data;
    });
}
exports.fireLogResponse = fireLogResponse;
//create json response faceLog report for send to client
function faceLogResponse(response, allowed) {
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            //get personnel from mongo db by id
            let _personnel;
            if (response.data.hits.hits[i]._source.personnel_id !== "-1") {
                _personnel = yield personnel_1.default.findById(response.data.hits.hits[i]._source.personnel_id).exec();
            }
            else {
                _personnel = null;
            }
            //get camera from mongo db by id for get camera name
            let camera = yield camera_1.default.findById(response.data.hits.hits[i]._source.camera_id).exec();
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera === null || camera === void 0 ? void 0 : camera.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp),
                fullName: _personnel ? (_personnel === null || _personnel === void 0 ? void 0 : _personnel.first_name) + " " + (_personnel === null || _personnel === void 0 ? void 0 : _personnel.last_name) : "",
                allowed: false,
                // allowed: _personnel?.camera_whitelist.includes(
                //   response.data.hits.hits[i]._source.camera_id
                // )
                //   ? true
                //   : false,
            };
            if (allowed === null) {
                result.allowed = (_personnel === null || _personnel === void 0 ? void 0 : _personnel.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id)) ? true : false;
            }
            else if ((_personnel === null || _personnel === void 0 ? void 0 : _personnel.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id)) === allowed) {
                result.allowed = allowed;
            }
            else if ((_personnel === null || _personnel === void 0 ? void 0 : _personnel.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id)) === allowed) {
                break;
            }
            _data.push(yield result);
        }
        return _data;
    });
}
exports.faceLogResponse = faceLogResponse;
//create json response eventLog report for send to client
function eventLogResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        //create json response
        let _data = [];
        let cameraIds = [];
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            cameraIds.push(response.data.hits.hits[i]._source.log.camera_id);
            let camera = yield camera_1.default.findById(response.data.hits.hits[i]._source.log.camera_id).exec();
            let schedule = yield schedule_1.default.findById(response.data.hits.hits[i]._source.log.schedule_id).exec();
            let model;
            if (schedule) {
                let modelToCamera = yield modelToCamera_1.default.findById(schedule.model_camera_id).exec();
                if (modelToCamera) {
                    model = yield model_1.default.findById(modelToCamera.model_id).exec();
                }
            }
            let result = {
                camera_id: response.data.hits.hits[i]._source.log.camera_id,
                name: camera != null ? camera.name : "",
                time: new Date(response.data.hits.hits[i]._source.log.timestamp),
                ai: model != null ? model.category : "",
                description: response.data.hits.hits[i]._source.description,
            };
            _data.push(yield result);
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
