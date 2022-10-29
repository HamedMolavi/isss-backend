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
const schedule_1 = __importDefault(require("./../../models/schedule"));
const authentication_1 = require("./../../tools/authentication");
const convertTime_1 = require("./../../tools/convertTime");
const modelToCamera_1 = __importDefault(require("./../../models/modelToCamera"));
const error_handler_1 = require("../../error/error.handler");
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
//add route for register new schedule
router.post("", function (req, res, next) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { start, stop, dayOfWeek, camera_id, model_id, montionDetection, threshold, zones, min_people, max_people, timeDuplicationDiagnoses } = req.body;
            //verify body request
            if (!start || !stop || !dayOfWeek || !camera_id || !model_id) {
                req.flash("error", "Please fill all fields");
                return next(new error_handler_1.ApiError(400, "Please fill all fields"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //check for valid time
            if (!(0, convertTime_1.compareTime)(start, stop)) {
                req.flash("error", "Invalid time");
                return next(new error_handler_1.ApiError(400, "Invalid time"));
            }
            //search for model in DB
            let model2Camera = yield modelToCamera_1.default.findOneAndUpdate({
                $and: [{ model_id: model_id }, { camera_id: camera_id }],
            }, { is_enabled: true }, { new: true }).exec();
            //convert input time to cron format
            let start_cron = (0, convertTime_1.convertToCron)(start);
            start_cron = (0, convertTime_1.convertToCronDay)(start_cron, dayOfWeek.toString());
            let stop_cron = (0, convertTime_1.convertToCron)(stop);
            stop_cron = (0, convertTime_1.convertToCronDay)(stop_cron, dayOfWeek.toString());
            //fil new schedule
            let schedule = new schedule_1.default({
                start_cron: start_cron,
                stop_cron: stop_cron,
                model_camera_id: model2Camera === null || model2Camera === void 0 ? void 0 : model2Camera._id,
                montionDetection: montionDetection,
                config: {
                    timeDuplicationDiagnoses: timeDuplicationDiagnoses !== null && timeDuplicationDiagnoses !== void 0 ? timeDuplicationDiagnoses : 0,
                    threshold: threshold != undefined ? threshold / 100 : 0,
                    zones: zones && zones.length != 0 ? zones : [[0, 0, 1, 1]],
                    min_people: min_people !== null && min_people !== void 0 ? min_people : 0,
                    max_people: max_people !== null && max_people !== void 0 ? max_people : 0,
                },
            });
            //save schedule in DB
            yield schedule.save();
            //return success
            req.flash("info", "schedule added");
            return res.status(201).json({
                success: true,
                data: {
                    _id: schedule._id,
                    start_cron: {
                        min: schedule.start_cron.split(" ")[0],
                        hour: schedule.start_cron.split(" ")[1],
                        dow: (_a = schedule.start_cron.split(" ")[4].split(",")) !== null && _a !== void 0 ? _a : ["*"],
                    },
                    stop_cron: {
                        min: schedule.stop_cron.split(" ")[0],
                        hour: schedule.stop_cron.split(" ")[1],
                        dow: (_b = schedule.stop_cron.split(" ")[4].split(",")) !== null && _b !== void 0 ? _b : ["*"],
                    },
                    model_camera_id: schedule.model_camera_id,
                    config: {
                        timeDuplicationDiagnoses: (_c = schedule.config.timeDuplicationDiagnoses) !== null && _c !== void 0 ? _c : 0,
                        threshold: ((_d = schedule.config) === null || _d === void 0 ? void 0 : _d.threshold) != 0 ? ((_e = schedule.config) === null || _e === void 0 ? void 0 : _e.threshold) * 100 : 0,
                        zones: (_f = schedule.config.zones) !== null && _f !== void 0 ? _f : null,
                        min_people: (_g = schedule.config.min_people) !== null && _g !== void 0 ? _g : 0,
                        max_people: (_h = schedule.config.max_people) !== null && _h !== void 0 ? _h : 0,
                    },
                },
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
//route for get schedule list
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.PerPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get schedule from DB
            let schedules = yield schedule_1.default.find({})
                .limit(perPage)
                .skip(perPage * (page - 1))
                .exec();
            let response_list = schedules.map((_schedule) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                let data = {
                    _id: _schedule._id,
                    start_cron: {
                        min: _schedule.start_cron.split(" ")[0],
                        hour: _schedule.start_cron.split(" ")[1],
                        dow: (_a = _schedule.start_cron.split(" ")[4].split(",")) !== null && _a !== void 0 ? _a : ["*"],
                    },
                    stop_cron: {
                        min: _schedule.stop_cron.split(" ")[0],
                        hour: _schedule.stop_cron.split(" ")[1],
                        dow: (_b = _schedule.stop_cron.split(" ")[4].split(",")) !== null && _b !== void 0 ? _b : ["*"],
                    },
                    model_camera_id: _schedule.model_camera_id,
                    config: {
                        timeDuplicationDiagnoses: (_c = _schedule.config.timeDuplicationDiagnoses) !== null && _c !== void 0 ? _c : 0,
                        threshold: ((_d = _schedule.config) === null || _d === void 0 ? void 0 : _d.threshold) != 0 ? ((_e = _schedule.config) === null || _e === void 0 ? void 0 : _e.threshold) * 100 : 0,
                        zones: (_f = _schedule.config.zones) !== null && _f !== void 0 ? _f : null,
                        min_people: (_g = _schedule.config.min_people) !== null && _g !== void 0 ? _g : 0,
                        max_people: (_h = _schedule.config.max_people) !== null && _h !== void 0 ? _h : 0,
                    },
                };
                return data;
            });
            //return success
            req.flash("info", "schedule list");
            //send response to client with schedules
            return res.status(200).json({
                success: true,
                data: response_list,
                page: page,
                perPage: perPage,
                total: yield schedule_1.default.countDocuments().exec(),
                pages: Math.ceil((yield schedule_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
//route for get schedule by id from DB
router.get("/:id", function (req, res, next) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Schedule id is required");
                return next(new error_handler_1.ApiError(400, "Schedule id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get schedule by id from DB
            let schedule = yield schedule_1.default.findById(id).exec();
            //return response not found to client if not found schedule
            if (!schedule) {
                req.flash("error", "schedule not found");
                return next(new error_handler_1.ApiError(404, "schedule not found"));
            }
            //return response to client with schedule
            return res.status(200).json({
                message: "Success",
                schedule: {
                    _id: schedule._id,
                    start_cron: {
                        min: schedule.start_cron.split(" ")[0],
                        hour: schedule.start_cron.split(" ")[1],
                        dow: (_a = schedule.start_cron.split(" ")[4].split(",")) !== null && _a !== void 0 ? _a : ["*"],
                    },
                    stop_cron: {
                        min: schedule.stop_cron.split(" ")[0],
                        hour: schedule.stop_cron.split(" ")[1],
                        dow: (_b = schedule.stop_cron.split(" ")[4].split(",")) !== null && _b !== void 0 ? _b : ["*"],
                    },
                    model_camera_id: schedule.model_camera_id,
                    config: {
                        timeDuplicationDiagnoses: (_d = (_c = schedule.config) === null || _c === void 0 ? void 0 : _c.timeDuplicationDiagnoses) !== null && _d !== void 0 ? _d : 0,
                        threshold: ((_e = schedule.config) === null || _e === void 0 ? void 0 : _e.threshold) != 0 ? ((_f = schedule.config) === null || _f === void 0 ? void 0 : _f.threshold) * 100 : 0,
                        zones: (_g = schedule.config.zones) !== null && _g !== void 0 ? _g : null,
                        min_people: (_h = schedule.config.min_people) !== null && _h !== void 0 ? _h : 0,
                        max_people: (_j = schedule.config.max_people) !== null && _j !== void 0 ? _j : 0,
                    },
                },
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
//add route for edit schedule
router.patch("/:id", function (req, res, next) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "schedule id is required");
                return next(new error_handler_1.ApiError(400, "schedule id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //get body from request
            const scheduleBody = req.body;
            if (!scheduleBody.start && !scheduleBody.stop && scheduleBody.dayOfWeek) {
                req.flash("error", "start and stop is required");
                return next(new error_handler_1.ApiError(400, "start and stop is required"));
            }
            if (scheduleBody.start && !scheduleBody.stop && !scheduleBody.dayOfWeek) {
                req.flash("error", "start and stop is required");
                return next(new error_handler_1.ApiError(400, "start and stop is required"));
            }
            if (!scheduleBody.start && scheduleBody.stop && !scheduleBody.dayOfWeek) {
                req.flash("error", "start and stop is required");
                return next(new error_handler_1.ApiError(400, "start and stop is required"));
            }
            let start_cron = "", stop_cron = "";
            if (scheduleBody.start && scheduleBody.stop) {
                //check for valid time
                if (!(0, convertTime_1.compareTime)(scheduleBody.start, scheduleBody.stop)) {
                    req.flash("error", "Invalid time");
                    return next(new error_handler_1.ApiError(400, "Invalid time"));
                }
                //convert input time to cron format
                start_cron = (0, convertTime_1.convertToCron)(scheduleBody.start);
                start_cron = (0, convertTime_1.convertToCronDay)(start_cron, scheduleBody.dayOfWeek.toString());
                stop_cron = (0, convertTime_1.convertToCron)(scheduleBody.stop);
                stop_cron = (0, convertTime_1.convertToCronDay)(stop_cron, scheduleBody.dayOfWeek.toString());
            }
            let old_schedule = yield schedule_1.default.findById(id).exec();
            let update_schedule = {
                start_cron: start_cron != "" ? start_cron : old_schedule.start_cron,
                stop_cron: stop_cron != "" ? stop_cron : old_schedule.stop_cron,
                model_camera_id: (_a = scheduleBody.model_camera_id) !== null && _a !== void 0 ? _a : old_schedule === null || old_schedule === void 0 ? void 0 : old_schedule.model_camera_id,
                config: {
                    timeDuplicationDiagnoses: (_b = scheduleBody.timeDuplicationDiagnoses) !== null && _b !== void 0 ? _b : old_schedule === null || old_schedule === void 0 ? void 0 : old_schedule.config.timeDuplicationDiagnoses,
                    threshold: (_c = (scheduleBody === null || scheduleBody === void 0 ? void 0 : scheduleBody.threshold) / 100) !== null && _c !== void 0 ? _c : (_d = old_schedule === null || old_schedule === void 0 ? void 0 : old_schedule.config) === null || _d === void 0 ? void 0 : _d.threshold,
                    zones: scheduleBody.zones.length > 0 ? scheduleBody.zones : (_e = old_schedule === null || old_schedule === void 0 ? void 0 : old_schedule.config) === null || _e === void 0 ? void 0 : _e.zones,
                    min_people: (_f = scheduleBody.min_people) !== null && _f !== void 0 ? _f : (_g = old_schedule === null || old_schedule === void 0 ? void 0 : old_schedule.config) === null || _g === void 0 ? void 0 : _g.min_people,
                    max_people: (_h = scheduleBody.max_people) !== null && _h !== void 0 ? _h : (_j = old_schedule === null || old_schedule === void 0 ? void 0 : old_schedule.config) === null || _j === void 0 ? void 0 : _j.max_people,
                },
            };
            //query for get schedule by id from DB and update
            let schedule = yield schedule_1.default.findByIdAndUpdate(id, update_schedule, {
                new: true,
            }).exec();
            //return response not found to client if not found schedule
            if (!schedule) {
                req.flash("error", "schedule not found");
                return next(new error_handler_1.ApiError(404, "schedule not found"));
            }
            //return response to client with schedule
            return res.status(201).json({
                message: "Success",
                schedule: {
                    _id: schedule._id,
                    start_cron: {
                        min: schedule.start_cron.split(" ")[0],
                        hour: schedule.start_cron.split(" ")[1],
                        dow: (_k = schedule.start_cron.split(" ")[4].split(",")) !== null && _k !== void 0 ? _k : ["*"],
                    },
                    stop_cron: {
                        min: schedule.stop_cron.split(" ")[0],
                        hour: schedule.stop_cron.split(" ")[1],
                        dow: (_l = schedule.stop_cron.split(" ")[4].split(",")) !== null && _l !== void 0 ? _l : ["*"],
                    },
                    model_camera_id: schedule.model_camera_id,
                    config: {
                        timeDuplicationDiagnoses: (_m = schedule.config.timeDuplicationDiagnoses) !== null && _m !== void 0 ? _m : 0,
                        threshold: ((_o = schedule.config) === null || _o === void 0 ? void 0 : _o.threshold) != 0 ? ((_p = schedule.config) === null || _p === void 0 ? void 0 : _p.threshold) * 100 : 0,
                        zones: (_q = schedule.config.zones) !== null && _q !== void 0 ? _q : null,
                        min_people: (_r = schedule.config.min_people) !== null && _r !== void 0 ? _r : 0,
                        max_people: (_s = schedule.config.max_people) !== null && _s !== void 0 ? _s : 0,
                    },
                },
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
//add route for delete schedule
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "schedule id is required");
                return next(new error_handler_1.ApiError(400, "schedule id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get schedule by id from DB
            let schedule = yield schedule_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found schedule
            if (!schedule) {
                req.flash("error", "schedule not found");
                return next(new error_handler_1.ApiError(404, "schedule not found"));
            }
            let model2Camera = yield modelToCamera_1.default.findByIdAndUpdate(schedule.model_camera_id, { is_enabled: false }, { new: true }).exec();
            // let model2Camera = await ModelToCamera.findOneAndDelete({sche})
            //return response to client with schedule
            return res.status(201).json({
                message: "Success",
                schedule: schedule,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
exports.default = router;
