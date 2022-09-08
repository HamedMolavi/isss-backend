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
const error_handler_1 = require("../../../error/error.handler");
const camera_1 = __importDefault(require("../../../models/camera"));
const model_1 = __importDefault(require("../../../models/model"));
const modelToCamera_1 = __importDefault(require("../../../models/modelToCamera"));
const authentication_1 = require("../../../tools/authentication");
const convertTime_1 = require("../../../tools/convertTime");
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
//add route for register modelToCamera
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { camera_id, start, stop, dayOfWeek, model_id } = req.body;
            //verify body request
            if (!camera_id || start || stop || !dayOfWeek || !model_id) {
                req.flash("error", "Departement name is required");
                return next(new error_handler_1.ApiError(400, "Departement name is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //convert input time to cron format
            let start_cron = (0, convertTime_1.convertToCron)(start);
            start_cron = (0, convertTime_1.convertToCronDay)(start_cron, dayOfWeek.toString());
            let stop_cron = (0, convertTime_1.convertToCron)(stop);
            stop_cron = (0, convertTime_1.convertToCronDay)(stop_cron, dayOfWeek.toString());
            //query for save new schedule in DB
            let modelToCamera = yield modelToCamera_1.default.findOne({
                $and: [
                    { start_cron: start_cron },
                    { stop_cron: stop_cron },
                    { model_id: model_id },
                    { camera_id: camera_id },
                ],
            }).exec();
            if (modelToCamera) {
                req.flash("error", "This modelToCamera is already exist");
                return next(new error_handler_1.ApiError(400, "This schedule is already exist"));
            }
            //create new modelToCamera
            modelToCamera = new modelToCamera_1.default({
                camera_id: camera_id,
                start_cron: start_cron,
                stop_cron: stop_cron,
                model_id: model_id,
            });
            //save modelToCamera
            yield modelToCamera.save();
            //send response
            res.status(201).json({
                success: true,
                data: modelToCamera,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get modelsToCamera list
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            let search = req.query.search || "";
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get departements list
            let model2Cameras = [];
            if (!(search && search.length > 0)) {
                let camera = yield camera_1.default.find({
                    name: { $regex: search, $options: "i" },
                })
                    .skip((page - 1) * perPage)
                    .limit(perPage)
                    .exec();
                model2Cameras = yield modelToCamera_1.default.find({
                    camera_id: { $regex: camera[0]._id.toString(), $options: "i" },
                })
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            else {
                model2Cameras = yield modelToCamera_1.default.find({})
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            //return response not found to client if not found modelToCamera
            if (!model2Cameras) {
                req.flash("error", "modelToCamera not found");
                return next(new error_handler_1.ApiError(404, "modelToCamera not found"));
            }
            let response = [{}];
            //ceate json response
            let json = model2Cameras.forEach((model2Camera) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                return response.push({
                    camera: (_a = (yield camera_1.default.findById({})
                        .skip((page - 1) * perPage)
                        .limit(perPage)
                        .exec())) !== null && _a !== void 0 ? _a : "not found",
                    model: yield model_1.default.findById({})
                        .skip((page - 1) * perPage)
                        .limit(perPage)
                        .exec(),
                });
            }));
            //return response to client with modelToCamera list
            return res.status(200).json({
                success: true,
                data: response,
                page: page,
                perPage: perPage,
                total: yield modelToCamera_1.default.countDocuments().exec(),
                pages: Math.ceil((yield modelToCamera_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
