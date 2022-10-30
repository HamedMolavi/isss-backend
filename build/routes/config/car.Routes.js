"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const carBrand_1 = __importDefault(require("../../models/carBrand"));
const carColor_1 = __importDefault(require("../../models/carColor"));
const personnel_1 = __importDefault(require("../../models/personnel"));
const EnglishToPersianPlate_1 = __importStar(require("../../tools/EnglishToPersianPlate"));
const car_1 = __importDefault(require("./../../models/car"));
const authentication_1 = require("./../../tools/authentication");
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
//add route for register new car
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { owner, number_plate, brand, color, camera_whitelist } = req.body;
            if (!owner || !number_plate || !brand || !color || !camera_whitelist) {
                req.flash("error", "Car is required");
                return next(new error_handler_1.ApiError(400, "Car is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //add plate number to json response for sort persian format in font end
            let plateNumber = {
                first: number_plate.first,
                second: number_plate.second,
                third: number_plate.third,
                fourth: number_plate.fourth,
                fifth: number_plate.fifth,
            };
            let plate_number_engglish = `${plateNumber.first}${EnglishToPersianPlate_1.toEnglishPLate[plateNumber.second]}${plateNumber.third}${plateNumber.fifth}`;
            //query for save new car in DB
            let car = yield car_1.default.findOne({ number_plate: plate_number_engglish }).exec();
            //retrun error if car already exists
            if (car) {
                req.flash("error", "Car already exists");
                return next(new error_handler_1.ApiError(400, "Car already exists"));
            }
            //fill new car
            let newCar = new car_1.default({
                owner: owner,
                number_plate: plate_number_engglish,
                brand: brand,
                color: color,
                camera_whitelist: camera_whitelist,
            });
            //query for save new car in DB
            yield newCar.save();
            req.flash("info", "Car added");
            //send response to client
            return res.status(201).json({
                success: true,
                data: {
                    owner: newCar.owner,
                    number_plate: {
                        first: Number(newCar.number_plate.substr(0, 2)),
                        second: EnglishToPersianPlate_1.default[newCar.number_plate.substr(2, 1)],
                        third: Number(newCar.number_plate.substr(3, 3)),
                        fourth: "ایران",
                        fifth: Number(newCar.number_plate.substr(6, 2)),
                    },
                    brand: newCar.brand,
                    color: newCar.color,
                    camera_whitelist: camera_whitelist,
                },
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
            let search = req.query.search || "";
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get car list from DB
            let cars = [];
            if (search && search.length > 0) {
                cars = yield car_1.default.find({
                    number_plate: { $regex: search, $options: "i" },
                })
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            else {
                cars = yield car_1.default.find({})
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            //return response not found to client if not found cars
            if (!cars) {
                req.flash("error", "car not found");
                return next(new error_handler_1.ApiError(404, "car not found"));
            }
            let newCars = [];
            for (let i = 0; i < cars.length; ++i) {
                let personnel = yield personnel_1.default.findById(cars[i].owner).exec();
                let _brand;
                let _color;
                if (cars[i].brand) {
                    _brand = yield carBrand_1.default.findById(cars[i].brand).exec();
                }
                if (cars[i].color) {
                    _color = yield carColor_1.default.findById(cars[i].color).exec();
                }
                let _owner = personnel != null ? `${personnel === null || personnel === void 0 ? void 0 : personnel.first_name} ${personnel === null || personnel === void 0 ? void 0 : personnel.last_name}` : "";
                let result = {
                    _id: cars[i]._id,
                    owner: _owner,
                    number_plate: {
                        first: cars[i].number_plate != null ? Number(cars[i].number_plate.substr(0, 2)) : "",
                        second: cars[i].number_plate != null ? EnglishToPersianPlate_1.default[cars[i].number_plate.substr(2, 1)] : "",
                        third: cars[i].number_plate != null ? Number(cars[i].number_plate.substr(3, 3)) : "",
                        fourth: "ایران",
                        fifth: cars[i].number_plate != null ? Number(cars[i].number_plate.substr(6, 2)) : "",
                    },
                    brand: _brand != null ? _brand.name : "",
                    color: _color != null ? _color.name : "",
                    camera_whitelist: cars[i].camera_whitelist,
                    time: cars[i].create_date,
                    __v: cars[i].__v,
                };
                newCars.push(result);
            }
            //return response to client with cars list
            return res.status(200).json({
                success: true,
                data: newCars,
                page: page,
                perPage: perPage,
                total: yield car_1.default.countDocuments().exec(),
                pages: Math.ceil((yield car_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
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
                return next(new error_handler_1.ApiError(400, "Car id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            // let s;
            // let test = await Car.find().populate("owner").populate("brand").populate("color");
            // console.log(test);
            //query for get car by id from DB
            let car = yield car_1.default.findById(id).exec();
            //return response not found to client if not found car
            if (!car) {
                req.flash("error", "Car not found");
                return next(new error_handler_1.ApiError(404, "Car not found"));
            }
            //return response to client with departemen
            return res.status(200).json({
                success: true,
                data: {
                    _id: car._id,
                    owner: car.owner,
                    number_plate: {
                        first: Number(car.number_plate.substr(0, 2)),
                        second: EnglishToPersianPlate_1.default[car.number_plate.substr(2, 1)],
                        third: Number(car.number_plate.substr(3, 3)),
                        fourth: "ایران",
                        fifth: Number(car.number_plate.substr(6, 2)),
                    },
                    brand: car.brand,
                    color: car.color,
                    camera_whitelist: car.camera_whitelist,
                    time: car.create_date,
                    __v: car.__v,
                },
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//add route for edit car
router.patch("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                req.flash("error", "Car id is required");
                return next(new error_handler_1.ApiError(400, "Car id is required"));
            }
            //get body request
            const carBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            let plateNumber = {};
            if (carBody.number_plate) {
                //add plate number to json response for sort persian format in font end
                plateNumber = {
                    first: carBody.number_plate.first,
                    second: carBody.number_plate.second,
                    third: carBody.number_plate.third,
                    fourth: carBody.number_plate.fourth,
                    fifth: carBody.number_plate.fifth,
                };
                let plate_number_engglish = `${plateNumber.first}${EnglishToPersianPlate_1.toEnglishPLate[plateNumber.second]}${plateNumber.third}${plateNumber.fifth}`;
                carBody.number_plate = plate_number_engglish;
            }
            //query for get car by id from DB and update
            let car = yield car_1.default.findByIdAndUpdate(id, carBody, { new: true }).exec();
            //return response not found to client if not found car
            if (!car) {
                req.flash("error", "Car not found");
                return next(new error_handler_1.ApiError(404, "Car not found"));
            }
            //return response to client with car
            return res.status(201).json({
                success: true,
                data: {
                    _id: car._id,
                    owner: car.owner,
                    number_plate: {
                        first: Number(car.number_plate.substr(0, 2)),
                        second: EnglishToPersianPlate_1.default[car.number_plate.substr(2, 1)],
                        third: Number(car.number_plate.substr(3, 3)),
                        fourth: "ایران",
                        fifth: Number(car.number_plate.substr(6, 2)),
                    },
                    brand: car.brand,
                    color: car.color,
                    camera_whitelist: car.camera_whitelist,
                    time: car.create_date,
                    __v: car.__v,
                },
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
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
                return next(new error_handler_1.ApiError(400, "Car id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get car by id from DB
            let car = yield car_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found car
            if (!car) {
                req.flash("error", "Car not found");
                return next(new error_handler_1.ApiError(404, "Car not found"));
            }
            //return response to client with car
            return res.status(201).json({
                success: true,
                data: {
                    _id: car._id,
                    owner: car.owner,
                    number_plate: {
                        first: Number(car.number_plate.substr(0, 2)),
                        second: EnglishToPersianPlate_1.default[car.number_plate.substr(2, 1)],
                        third: Number(car.number_plate.substr(3, 3)),
                        fourth: "ایران",
                        fifth: Number(car.number_plate.substr(6, 2)),
                    },
                    brand: car.brand,
                    color: car.color,
                    camera_whitelist: car.camera_whitelist,
                    time: car.create_date,
                    __v: car.__v,
                },
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
