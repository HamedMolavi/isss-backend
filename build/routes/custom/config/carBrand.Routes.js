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
const carBrand_1 = __importDefault(require("./../../../models/carBrand"));
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
//add route for register new car_brand
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name } = req.body;
            //verify body request
            if (!name) {
                req.flash("error", "Car brand is required");
                return next(new error_handler_1.ApiError(400, "Bad request car brand is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for save new car_brand in DB
            let carBrand = yield carBrand_1.default.findOne({ name: name }).exec();
            //retrun error if car_brand already exists
            if (carBrand) {
                req.flash("error", "Car Brand already exists");
                return next(new error_handler_1.ApiError(400, "Car Brand already exists"));
            }
            //fill new car_brand
            let newCarBrand = new carBrand_1.default({
                name: name
            });
            //query for save new car_brand in DB
            yield newCarBrand.save();
            req.flash("info", "Car Brand added");
            return res.status(201).json({
                success: true,
                data: newCarBrand
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get car list  
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
            //query for get car_barnd list
            let carBrands = [];
            if (!(search && search.length > 0)) {
                carBrands = yield carBrand_1.default.find({
                    name: { $regex: search, $options: "i" }
                }).limit(perPage).skip(perPage * (page - 1)).exec();
            }
            else {
                carBrands = yield carBrand_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            }
            //return response not found to client if not found car_brand
            if (!carBrands) {
                req.flash("error", "Car Brands not found");
                return next(new error_handler_1.ApiError(404, "Car Brands not found"));
            }
            //return response to client with car_brand list
            return res.status(200).json({
                success: true,
                data: carBrands,
                page: page,
                perPage: perPage,
                total: yield carBrand_1.default.countDocuments().exec(),
                pages: Math.ceil((yield carBrand_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get car_brand by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Car Brand id is required");
                return next(new error_handler_1.ApiError(400, "Bad request car brand id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get car_brand by id from DB
            let carBrand = yield carBrand_1.default.findById(id).exec();
            //return response not found to client if not found car_brand
            if (!carBrand) {
                req.flash("error", "Car Brand not found");
                return next(new error_handler_1.ApiError(404, "Car Brand not found"));
            }
            //return response to client with car
            return res.status(200).json({
                success: true,
                data: carBrand
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//add route for delete car_brand by id from DB
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Car Brand id is required");
                return next(new error_handler_1.ApiError(400, "Bad request car brand id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get car_brand by id from DB
            let carBrand = yield carBrand_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found car_brand
            if (!carBrand) {
                req.flash("error", "Car Brand not found");
                return next(new error_handler_1.ApiError(404, "Car Brand not found"));
            }
            //return response to client with car_brand
            return res.status(201).json({
                success: true,
                data: carBrand
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
