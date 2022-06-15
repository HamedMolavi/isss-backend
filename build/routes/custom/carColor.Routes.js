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
const carColor_1 = __importDefault(require("../../models/carColor"));
const authentication_1 = require("../../tools/authentication");
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
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name } = req.body;
            //verify body request
            if (!name) {
                req.flash("error", "Car Color name is required");
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
            //query for save new car_color in DB
            let carColor = yield carColor_1.default.findOne({ name: name }).exec();
            //retrun error if car_color already exists
            if (carColor) {
                req.flash("error", "Car Color already exists");
                return next({ status: 400, message: "Car Color already exists" });
            }
            //fill new car_color
            let newCarColor = new carColor_1.default({
                name: name
            });
            //query for save new car_color in DB
            yield newCarColor.save();
            req.flash("info", "Car Color added");
            return res.status(201).json({
                message: "color created",
                carColor: newCarColor
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the car color: ${err}` });
        }
    });
});
//route for get car_color with search from DB 
router.get("/find", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get param from url
            let search = req.query.search;
            let strLimit = req.query.limit;
            let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
            if (!search) {
                req.flash("error", "Search is required");
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
            //query for search car_color by id from DB
            let carColor = yield carColor_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found car_color
            if (!carColor) {
                req.flash("error", "Car Color not found");
                return next({ status: 404, message: "Car Color not found" });
            }
            //return response to client with car_color
            return res.status(200).json({
                message: "Success",
                carColor: carColor,
                limit: limit,
                total: yield carColor_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the Car Color: ${err}` });
        }
    });
});
//route for get car_color list  
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
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
            //query for get car_color list
            let carColors = yield carColor_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            //return response not found to client if not found car_colors
            if (!carColors) {
                req.flash("error", "Car Color not found");
                return next({ status: 404, message: "Car Color not found" });
            }
            //return response to client with car_color list
            return res.status(200).json({
                message: "Success",
                carColors: carColors,
                page: page,
                perPage: perPage,
                total: yield carColor_1.default.countDocuments().exec(),
                pages: Math.ceil((yield carColor_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the car color: ${err}` });
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
            //query for get car_color by id from DB
            let carColor = yield carColor_1.default.findById(id).exec();
            //return response not found to client if not found car_color
            if (!carColor) {
                req.flash("error", "Car Color not found");
                return next({ status: 404, message: "Car Color not found" });
            }
            //return response to client with car_color
            return res.status(200).json({
                message: "Success",
                carColor: carColor
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the car color: ${err}` });
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
            //query for get car_color by id from DB
            let carColor = yield carColor_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found car_color
            if (!carColor) {
                req.flash("error", "Car Color not found");
                return next({ status: 404, message: "Car Color not found" });
            }
            //return response to client with car_color
            return res.status(201).json({
                message: "Success",
                carColor: carColor
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the car color: ${err}` });
        }
    });
});
exports.default = router;
