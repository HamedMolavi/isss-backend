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
const path_1 = __importDefault(require("path"));
const error_handler_1 = require("../../error/error.handler");
const personImage_1 = __importDefault(require("../../models/personImage"));
const authentication_1 = require("./../../tools/authentication");
const fileUpload_1 = require("../../tools/fileUpload");
//get user role from enviroment variable
const const_role = process.env.const_role || "user";
//create router for add to routes file
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//route for get personnel by id from DB
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
            if (!id) {
                req.flash("error", "Please enter id");
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get personnel by id from DB
            let personImages = yield personImage_1.default.find({ person_id: id }).exec();
            //send not found if personnel not found
            if (!personImages) {
                req.flash("error", "personImages not found");
                return next(new error_handler_1.ApiError(404, "personImages not found"));
            }
            //define path folder fo read files
            let pathRead = path_1.default.join(__dirname, `./../../../assets/image/${id}/`);
            let faces_base64 = [];
            //check for exist path
            faces_base64 = yield (0, fileUpload_1.readFiles)(pathRead); //read all file in directory path an convert to base62 and get list base64
            if (faces_base64 == null) {
                req.flash("error", "path not found");
                return next(new error_handler_1.ApiError(404, "not found"));
            }
            //return response to client
            return res.status(201).json({
                success: true,
                data: faces_base64,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
//add route for delete image from folder assets\image
router.delete("/:hashid", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let hashid = req.params.hashid;
            if (!hashid) {
                req.flash("error", "Please enter hashid");
                return next(new error_handler_1.ApiError(400, "Please enter hashid"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get personnel by id from DB
            let personimage = yield personImage_1.default.findOne({ hash_id: hashid }).exec();
            if (!personimage) {
                req.flash("error", "personimage Not Found");
                return next(new error_handler_1.ApiError(404, "personimage Not Found"));
            }
            //decleare file name for delete
            let fileName = `${personimage.person_id.toString()}-${hashid}.jpeg`;
            //define path folder fo read files
            let pathDelete = path_1.default.join(__dirname, `./../../../assets/image/${personimage.person_id.toString()}/`);
            let result = yield (0, fileUpload_1.deleteFiles)(fileName, pathDelete); //delete file in assets folder
            if (!result) {
                req.flash("error", "image not found");
                return next(new error_handler_1.ApiError(404, "image not found"));
            }
            //delete from mongo
            let personimageDeleted = yield personImage_1.default.findOneAndDelete({ hash_id: hashid }).exec();
            //send response
            return res.status(201).json({
                success: true,
                data: personimageDeleted,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
exports.default = router;
