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
const car_1 = __importDefault(require("../../models/car"));
const authentication_1 = require("../../tools/authentication");
//create router for add to routes file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new car
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { owner, number_plate, brand_id, color_id, camera_whitelist } = req.body;
            if (!owner || !number_plate || !brand_id || !color_id || !camera_whitelist) {
                req.flash("error", "Car is required");
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
            //query for save new car in DB
            let car = yield car_1.default.findOne({
                $or: [
                    { number_plate: number_plate },
                    { owner: owner }
                ]
            }).exec();
            //retrun error if car already exists
            if (car) {
                req.flash("error", "Car already exists");
                return res.status(200).json({ message: "car already exists" });
            }
            //fill new car
            let newCar = new car_1.default({
                owner: owner,
                number_plate: number_plate,
                brand_id: brand_id,
                color_id: color_id,
                camera_whitelist: camera_whitelist
            });
            //query for save new car in DB
            yield newCar.save();
            req.flash("info", "Car added");
            //send response to client
            return res.status(201).json({
                message: "Success",
                car: newCar
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the car: ${err}` });
        }
    });
});
//route for get car with search from DB 
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
            //query for search car by id from DB
            let car = yield car_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found car
            if (!car) {
                req.flash("error", "Car not found");
                return next(new Error("Not Found"));
            }
            //return response to client with car
            return res.status(200).json({
                message: "Success",
                car: car,
                limit: limit,
                total: yield car_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the car: ${err}` });
        }
    });
});
//route for get car list  
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
            //query for get car list
            let cars = yield car_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            //return response not found to client if not found cars
            if (!cars) {
                req.flash("error", "car not found");
                return next(new Error("Not Found"));
            }
            //return response to client with cars list
            return res.status(200).json({
                message: "Success",
                cars: cars,
                page: page,
                perPage: perPage,
                total: yield car_1.default.countDocuments().exec(),
                pages: Math.ceil((yield car_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the cars: ${err}` });
        }
    });
});
//route for get car by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Car id is required");
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
            //query for get car by id from DB
            let car = yield car_1.default.findById(id).exec();
            //return response not found to client if not found car
            if (!car) {
                req.flash("error", "Car not found");
                return next(new Error("Not Found"));
            }
            //return response to client with departement
            return res.status(200).json({
                message: "Success",
                car: car
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the car: ${err}` });
        }
    });
});
//add route for edit car
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                req.flash("error", "Car id is required");
                return next({ status: 400, message: "Bad request" });
            }
            //get body request
            const carBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get car by id from DB and update
            let car = yield car_1.default.findByIdAndUpdate(id, carBody, { new: true }).exec();
            //return response not found to client if not found car
            if (!car) {
                req.flash("error", "Car not found");
                return next(new Error("Not Found"));
            }
            //return response to client with car
            return res.status(201).json({
                message: "Success",
                car: car
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the car: ${err}` });
        }
    });
});
//add route for delete car
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
            if (!id) {
                req.flash("error", "Car id is required");
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
            //query for get car by id from DB
            let car = yield car_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found car
            if (!car) {
                req.flash("error", "Car not found");
                return next(new Error("Not Found"));
            }
            //return response to client with car
            return res.status(201).json({
                message: "Success",
                car: car
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the car: ${err}` });
        }
    });
});
exports.default = router;
