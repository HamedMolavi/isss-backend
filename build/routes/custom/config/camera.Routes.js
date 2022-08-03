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
const camera_1 = __importDefault(require("./../../../models/camera"));
const authentication_1 = require("./../../../tools/authentication");
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
//add route for register new camera
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { section_id, url, ip, name, username, password, is_enabled, } = req.body;
            //verify body request
            if (!section_id ||
                !url ||
                !ip ||
                !name ||
                !username ||
                !password ||
                !is_enabled) {
                req.flash("error", "Veuillez remplir tous les champs");
                return next(new error_handler_1.ApiError(400, "Veuillez remplir tous les champs"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for save new Camera in DB
            let camera = yield camera_1.default.findOne({
                $or: [{ ip: ip }, { name: name }, { url: url }],
            }).exec();
            //return error if camera already exist
            if (camera) {
                req.flash("error", "camera already exist");
                return next(new error_handler_1.ApiError(400, "camera already exist"));
            }
            //fil new camera
            camera = new camera_1.default({
                section_id: section_id,
                url: url,
                ip: ip,
                name: name,
                username: username,
                password: password,
                is_enabled: is_enabled,
            });
            //save camera in DB
            yield camera.save();
            //return success
            req.flash("info", "camera added");
            return res.status(201).json({
                success: true,
                data: camera,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
//route for get cameras list
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            let search = req.query.search || "";
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            let cameras = [];
            //query for get cameras list
            if (search !== "") {
                cameras = yield camera_1.default.find({
                    name: { $regex: search, $options: "i" },
                })
                    .skip((page - 1) * perPage)
                    .limit(perPage)
                    .exec();
            }
            else {
                cameras = yield camera_1.default.find({})
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            //return response not found to client if not found cameras
            if (!cameras) {
                req.flash("error", "Cameras not found");
                return next(new error_handler_1.ApiError(404, "Cameras not found"));
            }
            //return response to client with departements list
            return res.status(200).json({
                success: true,
                data: cameras,
                page: page,
                perPage: perPage,
                total: yield camera_1.default.countDocuments().exec(),
                pages: Math.ceil((yield camera_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
//route for get camera by id from DB
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from params in url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "id not found");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get camera by id from DB
            let camera = yield camera_1.default.findById(id).exec();
            //return error if camera not found
            if (!camera) {
                req.flash("error", "camera not found");
                return next(new error_handler_1.ApiError(404, "camera not found"));
            }
            //send response to client with camera
            return res.status(200).json({
                success: true,
                data: camera,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
//add route for edit camera
router.patch("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "id not found");
                return next(new error_handler_1.ApiError(400, "Bad request id not found"));
            }
            //get jason from body request
            const cameraBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get user by id from DB
            let camera = yield camera_1.default.findByIdAndUpdate(id, cameraBody, {
                new: true,
            }).exec();
            //return error if user not found
            if (!camera) {
                req.flash("error", "camera not found");
                return next(new error_handler_1.ApiError(404, "camera not found"));
            }
            //send response to client with user
            return res.status(201).json({
                success: true,
                data: camera,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
//add route for delete camera
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                return next(new error_handler_1.ApiError(400, "Bad request id not found"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get camera by username from DB
            let camera = yield camera_1.default.findByIdAndDelete(id).exec();
            //return error if camera not found
            if (!camera) {
                req.flash("error", "camera not found");
                return next(new error_handler_1.ApiError(404, "camera not found"));
            }
            //send response to client with camera
            return res.status(201).json({
                success: true,
                data: camera,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
exports.default = router;
