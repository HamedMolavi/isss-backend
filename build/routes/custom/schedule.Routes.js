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
const schedule_1 = __importDefault(require("../../models/schedule"));
const authentication_1 = require("../../tools/authentication");
const convertTime_1 = require("../../tools/convertTime");
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
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { start, stop, dayOfWeek, model_camera_id, montionDetection, threshold, zones, min_people, max_people } = req.body;
            //verify body request
            if (!start || !stop || !dayOfWeek || !model_camera_id || !montionDetection || !threshold) {
                req.flash("error", "Please fill all fields");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //check for valid time
            if (!(0, convertTime_1.compareTime)(start, stop)) {
                req.flash("error", "Invalid time");
                return next({ status: 400, message: "Invalid time" });
            }
            //convert input time to cron format
            let start_cron = (0, convertTime_1.convertToCron)(start);
            start_cron = (0, convertTime_1.convertToCronDay)(start_cron, dayOfWeek.toString());
            let stop_cron = (0, convertTime_1.convertToCron)(stop);
            stop_cron = (0, convertTime_1.convertToCronDay)(stop_cron, dayOfWeek.toString());
            //query for save new schedule in DB
            let schedule = yield schedule_1.default.findOne({
                $or: [
                    { start_cron: start_cron },
                    { stop_cron: stop_cron },
                    { model_camera_id: model_camera_id }
                ]
            }).exec();
            //return error if schedule already exist
            if (schedule) {
                req.flash("error", "schedule already exist");
                return next({ status: 400, message: "schedule already exist" });
            }
            //fil new schedule
            schedule = new schedule_1.default({
                start_cron: start_cron,
                stop_cron: stop_cron,
                model_camera_id: model_camera_id,
                montionDetection: montionDetection,
                config: {
                    threshold: threshold !== null && threshold !== void 0 ? threshold : 0,
                    zones: zones !== null && zones !== void 0 ? zones : null,
                    min_people: min_people !== null && min_people !== void 0 ? min_people : 0,
                    max_people: max_people !== null && max_people !== void 0 ? max_people : 0
                }
            });
            //save schedule in DB
            yield schedule.save();
            //return success
            req.flash("info", "schedule added");
            return res.status(201).json({
                message: 'Success',
                schedule: schedule
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the schedule: ${err}` });
        }
    });
});
//route for get schedule list  
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.PerPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get schedule from DB
            let schedules = yield schedule_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            //return success
            req.flash("info", "schedule list");
            //send response to client with schedules
            return res.status(200).json({
                message: 'Success',
                schedules: schedules,
                page: page,
                perPage: perPage,
                total: yield schedule_1.default.countDocuments().exec(),
                pages: Math.ceil((yield schedule_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the AIs: ${err}` });
        }
    });
});
//route for get schedule list  
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.PerPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get schedule from DB
            let schedules = yield schedule_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            //return success
            req.flash("info", "schedule list");
            //send response to client with schedules
            return res.status(200).json({
                message: 'Success',
                schedules: schedules,
                page: page,
                perPage: perPage,
                total: yield schedule_1.default.countDocuments().exec(),
                pages: Math.ceil((yield schedule_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the AIs: ${err}` });
        }
    });
});
//route for get schedule by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Schedule id is required");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get schedule by id from DB
            let schedule = yield schedule_1.default.findById(id).exec();
            //return response not found to client if not found schedule
            if (!schedule) {
                req.flash("error", "schedule not found");
                return next({ status: 404, message: "schedule not found" });
            }
            //return response to client with schedule
            return res.status(200).json({
                message: "Success",
                schedule: schedule
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the schedule: ${err}` });
        }
    });
});
//add route for edit schedule
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "schedule id is required");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //get body from request
            const scheduleBody = req.body;
            if (!scheduleBody.start && !scheduleBody.stop && scheduleBody.dayOfWeek) {
                req.flash("error", "start and stop is required");
                return next({ status: 400, message: "Bad request" });
            }
            if (scheduleBody.start && !scheduleBody.stop && !scheduleBody.dayOfWeek) {
                req.flash("error", "start and stop is required");
                return next({ status: 400, message: "Bad request" });
            }
            if (!scheduleBody.start && scheduleBody.stop && !scheduleBody.dayOfWeek) {
                req.flash("error", "start and stop is required");
                return next({ status: 400, message: "Bad request" });
            }
            if (scheduleBody.start && scheduleBody.stop) {
                //check for valid time
                if (!(0, convertTime_1.compareTime)(scheduleBody.start, scheduleBody.stop)) {
                    req.flash("error", "Invalid time");
                    return next({ status: 400, message: "Invalid time" });
                }
                //convert input time to cron format
                let start_cron = (0, convertTime_1.convertToCron)(scheduleBody.start);
                start_cron = (0, convertTime_1.convertToCronDay)(start_cron, scheduleBody.dayOfWeek.toString());
                let stop_cron = (0, convertTime_1.convertToCron)(scheduleBody.stop);
                stop_cron = (0, convertTime_1.convertToCronDay)(stop_cron, scheduleBody.dayOfWeek.toString());
            }
            //query for get schedule by id from DB and update
            let schedule = yield schedule_1.default.findByIdAndUpdate(id, scheduleBody, { new: true }).exec();
            //return response not found to client if not found schedule
            if (!schedule) {
                req.flash("error", "schedule not found");
                return next({ status: 404, message: "schedule not found" });
            }
            //return response to client with schedule
            return res.status(201).json({
                message: "Success",
                schedule: schedule
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the departement: ${err}` });
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
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get schedule by id from DB
            let schedule = yield schedule_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found schedule
            if (!schedule) {
                req.flash("error", "schedule not found");
                return next({ status: 404, message: "schedule not found" });
            }
            //return response to client with schedule
            return res.status(201).json({
                message: "Success",
                schedule: schedule
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the schedule: ${err}` });
        }
    });
});
exports.default = router;
