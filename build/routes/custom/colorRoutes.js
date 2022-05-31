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
const color_1 = __importDefault(require("./../../models/color"));
const authentication_1 = require("./../../tools/authentication");
//create router for add to server file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new color
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name } = req.body;
            //verify body request
            if (!name) {
                req.flash("error", "Color name is required");
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
            //query for save new color in DB
            let color = yield color_1.default.findOne({ name: name }).exec();
            //retrun error if color already exists
            if (color) {
                req.flash("error", "Color already exists");
                return res.status(201).json({ message: "Color already exists" });
            }
            //fill new color
            let newColor = new color_1.default({
                name: name
            });
            //query for save new color in DB
            yield newColor.save();
            req.flash("info", "Color added");
            return res.status(201).json({
                message: "color created",
                color: newColor
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the color: ${err}` });
        }
    });
});
//route for get color with search from DB 
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
            //query for search color by id from DB
            let color = yield color_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found color
            if (!color) {
                req.flash("error", "Color not found");
                return next(new Error("Not Found"));
            }
            //return response to client with color
            return res.status(200).json({
                message: "Success",
                color: color,
                limit: limit,
                total: yield color_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the color: ${err}` });
        }
    });
});
//route for get color list  
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
            //query for get color list
            let colors = yield color_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            //return response not found to client if not found colors
            if (!colors) {
                req.flash("error", "Color not found");
                return next(new Error("Not Found"));
            }
            //return response to client with color list
            return res.status(200).json({
                message: "Success",
                colors: colors,
                page: page,
                perPage: perPage,
                total: yield color_1.default.countDocuments().exec(),
                pages: Math.ceil((yield color_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the color: ${err}` });
        }
    });
});
//route for get color by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Color id is required");
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
            //query for get color by id from DB
            let color = yield color_1.default.findById(id).exec();
            //return response not found to client if not found color
            if (!color) {
                req.flash("error", "Color not found");
                return next(new Error("Not Found"));
            }
            //return response to client with color
            return res.status(200).json({
                message: "Success",
                color: color
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the color: ${err}` });
        }
    });
});
//add route for delete color by id from DB
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Color id is required");
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
            //query for get color by id from DB
            let color = yield color_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found color
            if (!color) {
                req.flash("error", "Color not found");
                return next(new Error("Not Found"));
            }
            //return response to client with color
            return res.status(201).json({
                message: "Success",
                color: color
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the color: ${err}` });
        }
    });
});
exports.default = router;
