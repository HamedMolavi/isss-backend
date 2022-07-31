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
const departement_1 = __importDefault(require("../models/departement"));
//create json response sabotageLog report for send to client
function sabotageLogResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        //ceate json response
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
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        //query for get cars from mongo db with list color and list brand and list owner
        let cars;
        if (owner && carColor && carBrand) {
            cars = yield car_1.default.find({
                $and: [
                    { owner: { $in: owner } },
                    { color_id: { $in: carColor } },
                    { brand_id: { $in: carBrand } },
                ],
            }).exec();
        }
        else {
            //send error if owner or color or brand is not found in DB
            console.log("owner, carColor, carBrand is null");
            cars = yield car_1.default.find({}).exec();
        }
        //get casr with match plate_number from elastic search to cars plate_number
        let _data = [];
        //create json response
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: response.data.hits.hits[i]._source.camera,
                time: new Date(response.data.hits.hits[i]._source.timestamp),
                plate_number: response.data.hits.hits[i]._source.plate_number,
                owner: "",
                color: "",
                brand: "",
            };
            //get compare plate_number from elastic search to cars plate_number and get owner, color, brand fore search api
            for (let j = 0; j < cars.length; j++) {
                if (response.data.hits.hits[i]._source.plate_number === cars[j].number_plate) {
                    //let plateNumber = response.data.hits.hits[i]._source.plate_number.split();
                    //plateNumber[2] = toPersianPlate[plateNumber[2]];
                    // plateNumber = plateNumber[0] + plateNumber[1] + plateNumber[2] + plateNumber[3] + " ایران "+ plateNumber[4] + plateNumber[5];
                    //  let persianPlateNumber = plateNumber.replace("/[a-zA-Z]+/g",toPersianPlate.get(key));
                    //get owner from DB and set to result
                    result.owner =
                        (_a = (yield personnel_1.default.findById(cars[j].owner)
                            .exec()
                            .then((personnel) => {
                            return (personnel === null || personnel === void 0 ? void 0 : personnel.first_name) + " " + (personnel === null || personnel === void 0 ? void 0 : personnel.last_name);
                        }))) !== null && _a !== void 0 ? _a : "null";
                    //get color from DB and set to result
                    result.color =
                        (_b = (yield carColor_1.default.findById(cars[j].color_id)
                            .exec()
                            .then((carColor) => {
                            return carColor === null || carColor === void 0 ? void 0 : carColor.name;
                        }))) !== null && _b !== void 0 ? _b : "null";
                    //get brand from DB and set to result
                    result.brand =
                        (_c = (yield carBrand_1.default.findById(cars[j].brand_id)
                            .exec()
                            .then((car) => {
                            return car === null || car === void 0 ? void 0 : car.name;
                        }))) !== null && _c !== void 0 ? _c : "null";
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
        //ceate json response
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
            let result;
            if (allowed !== undefined &&
                ((_a = schedule === null || schedule === void 0 ? void 0 : schedule.config) === null || _a === void 0 ? void 0 : _a.max_people) >=
                    response.data.hits.hits[i].number_of_people ==
                    allowed) {
                result = {
                    camera_id: response.data.hits.hits[i]._source.camera_id,
                    camera: camera === null || camera === void 0 ? void 0 : camera.name,
                    time: new Date(response.data.hits.hits[i]._source.timestamp),
                    numberOfPeople: response.data.hits.hits[i]._source.number_of_people,
                    NumberOfPeople: ((_b = schedule === null || schedule === void 0 ? void 0 : schedule.config) === null || _b === void 0 ? void 0 : _b.max_people) >=
                        response.data.hits.hits[i].number_of_people
                        ? true
                        : false,
                };
            }
            else if (allowed === undefined) {
                result = {
                    camera_id: response.data.hits.hits[i]._source.camera_id,
                    camera: camera === null || camera === void 0 ? void 0 : camera.name,
                    time: new Date(response.data.hits.hits[i]._source.timestamp),
                    numberOfPeople: response.data.hits.hits[i]._source.number_of_people,
                    NumberOfPeople: ((_c = schedule === null || schedule === void 0 ? void 0 : schedule.config) === null || _c === void 0 ? void 0 : _c.max_people) >=
                        response.data.hits.hits[i].number_of_people
                        ? true
                        : false,
                };
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
        //ceate json response
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
function faceLogResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        //ceate json response
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
                fullName: (_personnel === null || _personnel === void 0 ? void 0 : _personnel.first_name) + " " + (_personnel === null || _personnel === void 0 ? void 0 : _personnel.last_name),
                Allowed: (_personnel === null || _personnel === void 0 ? void 0 : _personnel.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id))
                    ? true
                    : false,
            };
            _data.push(yield result);
        }
        return _data;
    });
}
exports.faceLogResponse = faceLogResponse;
//create json response eventLog report for send to client
function eventLogResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        //ceate json response
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
                let result = {
                    camera_id: response.data.hits.hits[0]._source.alerts[i].labels.camera_id,
                    camera: camera === null || camera === void 0 ? void 0 : camera.name,
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
exports.eventLogResponse = eventLogResponse;
//create json response eventLog report for send to client
function eventDepartmentLogResponse(response) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        //ceate json response
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
                let department = yield departement_1.default.findById((_a = sections[0]) === null || _a === void 0 ? void 0 : _a.departement_id).exec();
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
