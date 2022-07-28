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
const carColor_1 = __importDefault(require("./../../../models/carColor"));
const authentication_1 = require("./../../../tools/authentication");
//create router for add to server file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new car_color
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name } = req.body;
            //verify body request
            if (!name) {
                req.flash("error", "Car Color name is required");
                return next(new error_handler_1.ApiError(400, "Bad request car color name is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for save new car_color in DB
            let carColor = yield carColor_1.default.findOne({ name: name }).exec();
            //retrun error if car_color already exists
            if (carColor) {
                req.flash("error", "Car Color already exists");
                return next(new error_handler_1.ApiError(400, "Car Color already exists"));
            }
            //fill new car_color
            let newCarColor = new carColor_1.default({
                name: name
            });
            //query for save new car_color in DB
            yield newCarColor.save();
            req.flash("info", "Car Color added");
            return res.status(201).json({
                success: true,
                data: newCarColor
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get car_color list  
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
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get car_color list
            let carColors = [];
            if (!(search && search.length > 0)) {
                carColors = yield carColor_1.default.find({
                    name: { $regex: search, $options: "i" }
                }).limit(perPage).skip(perPage * (page - 1)).exec();
            }
            else {
                carColors = yield carColor_1.default.find().limit(perPage).skip(perPage * (page - 1)).exec();
            }
            //return response not found to client if not found car_colors
            if (!carColors) {
                req.flash("error", "Car Color not found");
                return next(new error_handler_1.ApiError(404, "Car Color not found"));
            }
            //return response to client with car_color list
            return res.status(200).json({
                success: true,
                data: carColors,
                page: page,
                perPage: perPage,
                total: yield carColor_1.default.countDocuments().exec(),
                pages: Math.ceil((yield carColor_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get car_color by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Car Color id is required");
                return next(new error_handler_1.ApiError(400, "Bad request car color id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get car_color by id from DB
            let carColor = yield carColor_1.default.findById(id).exec();
            //return response not found to client if not found car_color
            if (!carColor) {
                req.flash("error", "Car Color not found");
                return next(new error_handler_1.ApiError(404, "Car Color not found"));
            }
            //return response to client with car_color
            return res.status(200).json({
                success: true,
                data: carColor
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//add route for delete car_color by id from DB
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Car Color id is required");
                return next(new error_handler_1.ApiError(400, "Bad request car color id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get car_color by id from DB
            let carColor = yield carColor_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found car_color
            if (!carColor) {
                req.flash("error", "Car Color not found");
                return next(new error_handler_1.ApiError(404, "Car Color not found"));
            }
            //return response to client with car_color
            return res.status(201).json({
                success: true,
                data: carColor
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
