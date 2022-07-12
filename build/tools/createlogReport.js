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
                time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
            };
            _data.push(yield result);
        }
        return _data;
    });
}
exports.sabotageLogResponse = sabotageLogResponse;
//create json response plateLog report for send to client
function plateLogResponse(response) {
    return __awaiter(this, void 0, void 0, function* () {
        //ceate json response
        let _data = [];
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            //get camera from mongo db by id for get camera name
            let camera = yield camera_1.default.findById(response.data.hits.hits[i]._source.camera_id).exec();
            //get car from mongo db by id for get car name
            let car = yield car_1.default.findById(response.data.hits.hits[i]._source.plate_number).exec();
            //get car_color from mongo db by id for get car color
            let car_color = yield carColor_1.default.findById(car === null || car === void 0 ? void 0 : car.color_id).exec();
            //get car_brand from mongo db by id for get car brand
            let car_brand = yield carBrand_1.default.findById(car === null || car === void 0 ? void 0 : car.brand_id).exec();
            //get owner from mongo db by id for get owner name
            let owner = yield personnel_1.default.findById(car === null || car === void 0 ? void 0 : car.owner).exec();
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera === null || camera === void 0 ? void 0 : camera.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
                car: car_brand,
                color: car_color,
                plate: response.data.hits.hits[i]._source.plate_number,
                owner: (owner === null || owner === void 0 ? void 0 : owner.first_name) + " " + (owner === null || owner === void 0 ? void 0 : owner.last_name),
                allowed: (owner === null || owner === void 0 ? void 0 : owner.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id))
                    ? true
                    : false,
            };
            _data.push(yield result);
        }
        return _data;
    });
}
exports.plateLogResponse = plateLogResponse;
//create json response humanLog report for send to client
function humanLogResponse(response) {
    var _a;
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
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera === null || camera === void 0 ? void 0 : camera.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
                numberOfPeople: response.data.hits.hits[i]._source.number_of_people,
                NumberOfPeople: ((_a = schedule === null || schedule === void 0 ? void 0 : schedule.config) === null || _a === void 0 ? void 0 : _a.max_people) >=
                    response.data.hits.hits[i].number_of_people
                    ? true
                    : false,
            };
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
                time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
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
                time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
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
                    time: new Date(Number(response.data.hits.hits[0]._source.alerts[i].labels.timestamp) *
                        1000),
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
        console.log(response.data.hits.hits[0]._source.alerts);
        for (let i = 0; i < response.data.hits.hits[0]._source.alerts.length; i++) {
            //get camera from mongo db by id for get camera name
            if (cameraIds.includes(response.data.hits.hits[0]._source.alerts[i].labels.camera_id)) {
                continue;
            }
            else {
                cameraIds.push(response.data.hits.hits[0]._source.alerts[i].labels.camera_id);
                let camera = yield camera_1.default.findById(response.data.hits.hits[0]._source.alerts[i].labels.camera_id).exec();
                //let cameras = await Camera.find({ section_id: camera?.section_id }).exec();
                let sections = yield section_1.default.find({ section_id: camera === null || camera === void 0 ? void 0 : camera.section_id, }).exec();
                let department = yield departement_1.default.findById((_a = sections[0]) === null || _a === void 0 ? void 0 : _a.departement_id).exec();
                let result = {
                    department: department === null || department === void 0 ? void 0 : department.name,
                    sections: sections,
                    time: new Date(Number(response.data.hits.hits[0]._source.alerts[i].labels.timestamp) * 1000),
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
