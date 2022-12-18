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
const authentication_1 = require("../../tools/authentication");
const takeSnaphsot_1 = __importDefault(require("../../tools/takeSnaphsot"));
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
//route for get snapshot from camera with ip and username and password
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id; //get query parameter id from url
            //return null if id not found
            if (!id) {
                req.flash("error", "Please enter id");
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get camera from DB
            let camera = yield camera_1.default.findById(id).exec();
            //return response not found to client if not found camera
            if (!camera) {
                req.flash("error", "camera not found");
                return next(new error_handler_1.ApiError(404, "camera not found"));
            }
            let _camInfo = {
                ip: camera.ip,
                username: camera.username,
                password: camera.password,
            };
            let snapshotBase64 = yield (0, takeSnaphsot_1.default)(_camInfo);
            if (!snapshotBase64) {
                req.flash("error", "There was a problem on creating the image, please try again");
                return next(new error_handler_1.ApiError(404, "There was a problem on creating the image, please try again"));
            }
            //return response to client with departements file list
            return res.status(200).json({
                success: true,
                data: snapshotBase64,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
