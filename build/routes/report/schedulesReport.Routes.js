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
const department_1 = __importDefault(require("../../models/department"));
const model_1 = __importDefault(require("../../models/model"));
const authentication_1 = require("../../tools/authentication");
const schedule_1 = __importDefault(require("../../models/schedule"));
const modelToCamera_1 = __importDefault(require("../../models/modelToCamera"));
//get user role from enviroment variable
const const_role = process.env.const_role || "user";
//create router for add to server file
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//route for get departementfile list
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get departements list
            let models = yield model_1.default.find({}).exec();
            //query for get all section from DB
            let schedules = yield schedule_1.default.find({}).exec();
            //query for get all camera from DB
            let cameras = yield camera_1.default.find({}).exec();
            //query for get all camera from DB
            let modelToCamera = yield modelToCamera_1.default.find({}).exec();
            //return response not found to client if not found departements
            if (!modelToCamera) {
                req.flash("error", "modelToCamera not found");
                return next(new error_handler_1.ApiError(404, "ModelToCamera not found"));
            }
            let response = [];
            //loop for get sort departments and section in json response
            for (let i = 0; i < cameras.length; i++) {
                let childrenModel = [];
                for (let j = 0; j < modelToCamera.length; j++) {
                    let childrenSchedule = [];
                    if (cameras[i]._id.toString() == modelToCamera[j].camera_id.toString()) {
                        for (let k = 0; k < schedules.length; k++) {
                            if (schedules[k].model_camera_id.toString() == modelToCamera[j]._id.toString()) {
                                childrenSchedule.push({
                                    _id: schedules[k]._id,
                                    type: "schedule",
                                    start_cron: schedules[k].start_cron,
                                    stop_cron: schedules[k].stop_cron,
                                    model_camera_id: schedules[k].model_camera_id,
                                    config: {
                                        threshold: schedules[k].config.threshold,
                                        zones: schedules[k].config.zones,
                                        min_people: schedules[k].config.min_people,
                                        max_people: schedules[k].config.max_people,
                                    },
                                });
                            }
                        }
                        for (let p = 0; p < models.length; ++p) {
                            if (models[p]._id.toString() == modelToCamera[j].model_id.toString()) {
                                childrenModel.push({
                                    _id: models[p]._id,
                                    name: models[p].name,
                                    type: "model",
                                    category: models[p].category,
                                    uri: models[p].uri,
                                    children: childrenSchedule,
                                });
                            }
                        }
                    }
                    //sort section by name
                    childrenModel.sort((a, b) => {
                        if (a.name < b.name) {
                            return -1;
                        }
                        if (a.name > b.name) {
                            return 1;
                        }
                        return 0;
                    });
                }
                response.push({
                    _id: cameras[i]._id,
                    type: "camera",
                    name: cameras[i].name,
                    children: childrenModel,
                    section_id: cameras[i].section_id,
                    url: cameras[i].url,
                    username: cameras[i].username,
                    password: cameras[i].password,
                    ip: cameras[i].ip,
                    is_enabled: cameras[i].is_enabled,
                });
            }
            //sort departement by name
            response.sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });
            //return response to client with departements file list
            return res.status(200).json({
                success: true,
                data: response,
                total: yield department_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get departementfile list
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get departements list
            let models = yield model_1.default.find({}).exec();
            //query for get all section from DB
            let schedules = yield schedule_1.default.find({}).exec();
            //query for get all camera from DB
            let cameras = yield camera_1.default.find({}).exec();
            //query for get all camera from DB
            let modelToCamera = yield modelToCamera_1.default.find({}).exec();
            //return response not found to client if not found departements
            if (!modelToCamera) {
                req.flash("error", "modelToCamera not found");
                return next(new error_handler_1.ApiError(404, "ModelToCamera not found"));
            }
            let response = [];
            //loop for get sort departments and section in json response
            for (let i = 0; i < cameras.length; i++) {
                let childrenModel = [];
                if (cameras[i]._id.toString() === id) {
                    for (let j = 0; j < modelToCamera.length; j++) {
                        let childrenSchedule = [];
                        if (cameras[i]._id.toString() == modelToCamera[j].camera_id.toString()) {
                            for (let k = 0; k < schedules.length; k++) {
                                if (schedules[k].model_camera_id.toString() == modelToCamera[j]._id.toString()) {
                                    childrenSchedule.push({
                                        _id: schedules[k]._id,
                                        type: "schedule",
                                        start_cron: schedules[k].start_cron,
                                        stop_cron: schedules[k].stop_cron,
                                        model_camera_id: schedules[k].model_camera_id,
                                        config: {
                                            threshold: schedules[k].config.threshold,
                                            zones: schedules[k].config.zones,
                                            min_people: schedules[k].config.min_people,
                                            max_people: schedules[k].config.max_people,
                                        },
                                    });
                                }
                            }
                            for (let p = 0; p < models.length; ++p) {
                                if (models[p]._id.toString() == modelToCamera[j].model_id.toString()) {
                                    childrenModel.push({
                                        _id: models[p]._id,
                                        name: models[p].name,
                                        type: "model",
                                        category: models[p].category,
                                        uri: models[p].uri,
                                        children: childrenSchedule,
                                    });
                                }
                            }
                        }
                        //sort section by name
                        childrenModel.sort((a, b) => {
                            if (a.name < b.name) {
                                return -1;
                            }
                            if (a.name > b.name) {
                                return 1;
                            }
                            return 0;
                        });
                    }
                    response.push({
                        _id: cameras[i]._id,
                        type: "camera",
                        name: cameras[i].name,
                        children: childrenModel,
                        section_id: cameras[i].section_id,
                        url: cameras[i].url,
                        username: cameras[i].username,
                        password: cameras[i].password,
                        ip: cameras[i].ip,
                        is_enabled: cameras[i].is_enabled,
                    });
                    //sort departement by name
                    response.sort((a, b) => {
                        if (a.name < b.name) {
                            return -1;
                        }
                        if (a.name > b.name) {
                            return 1;
                        }
                        return 0;
                    });
                }
            }
            //return response to client with departements file list
            return res.status(200).json({
                success: true,
                data: response,
                total: yield department_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
