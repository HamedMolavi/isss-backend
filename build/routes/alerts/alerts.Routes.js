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
    console.log(path);
    res.sendFile(path);
});
//get alerts from back
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const bodyRequest = req.body;
            console.log(req.body);
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
                _owner = yield car_1.default.findOne({ number_plate: bodyRequest.log.plate_number }).exec();
            }
            let _personnel;
            if ((bodyRequest.log.personnel_id) && (bodyRequest.log.personnel_id !== -1)) {
                _personnel = yield personnel_1.default.findById(bodyRequest.log.personnel_id).exec();
            }
            // if(_owner_id )
            // {
            //    _owner_id = await Personnel.findById(_owner_id?._id).exec();
            // }
            let result = {
                type: bodyRequest.type,
                confidence: bodyRequest.log.confidence,
                camera: _camera === null || _camera === void 0 ? void 0 : _camera.name,
                section: _section === null || _section === void 0 ? void 0 : _section.name,
                departement: _departement === null || _departement === void 0 ? void 0 : _departement.name,
                personnel: (_personnel === null || _personnel === void 0 ? void 0 : _personnel.first_name) + " " + (_personnel === null || _personnel === void 0 ? void 0 : _personnel.last_name),
                description: bodyRequest.description,
                time: new Date(bodyRequest.log.timestamp),
                peopleCounting: bodyRequest.log.number_of_people,
                plate_number: bodyRequest.log.plate_number,
                owner: "_owner_id?._id",
            };
            // console.log(result);
            let notification = result;
            // if (bodyRequest.type === "face") {
            //   notification = `${result.personnel?.first_name} ${result.personnel?.last_name} with personnel code: ${result.personnel?.personnel_code} ditected in camera: ${result.camera}, section:${result.section}, department:${result.departement}`;
            // } else if (bodyRequest.type === "fire") {
            //   notification_text = `fire ditected in camera: ${result.camera}, section: ${result.section}, department: ${result.departement}`;
            // } else if (bodyRequest.type === "human") {
            //   notification_text = `#${result.peopleCounting} human(s) ditected in camera: ${result.camera}, section: ${result.section}, department: ${result.departement}`;
            // } else if (bodyRequest.type === "sabotage") {
            //   notification_text = `sabotage ditected in camera: ${result.camera}, section: ${result.section}, department: ${result.departement}`;
            // } else if (bodyRequest.type === "plate") {
            //   notification_text = `car plate: ${result.plate_number} with owner: ${result.owner} ditected in camera: ${result.camera}, section: ${result.section}, department:${result.departement}, owner: `;
            // }
            console.log(result);
            // console.log(notification_text);
            server_1.io.emit("get alert", notification);
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
