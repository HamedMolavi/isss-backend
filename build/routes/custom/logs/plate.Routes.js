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
const HttpException_1 = __importDefault(require("./../../../error/HttpException"));
const axios_1 = __importDefault(require("axios"));
const convertTimeEpokh_1 = __importDefault(require("./../../../tools/convertTimeEpokh"));
const authentication_1 = require("./../../../tools/authentication");
const car_1 = __importDefault(require("../../../models/car"));
const modelToCamera_1 = __importDefault(require("../../../models/modelToCamera"));
//create router for add to routes file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//get connection string from enviroment variable 
const dbUri = process.env["ELASTIC_SEARCH"];
//route for get sabotage list  
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get search from url
            let search = req.query.search || "";
            let response;
            let carDB;
            let model2camera;
            let _car;
            let _color;
            if (search !== "") {
                //get body from request
                const { camera_id, time, date_start, date_end, owner, car, color } = req.body;
                if (!camera_id || !time || !date_start || !date_end || !owner) {
                    req.flash("error", "Please fill all fields");
                    return next(new HttpException_1.default(400, "Bad Request", "Plate License"));
                }
                carDB = yield car_1.default.findOne({ owner: owner }).exec();
                if (!carDB) {
                    req.flash("error", "Owner not found");
                    return next(new HttpException_1.default(400, "Car Not Found", "Plate License"));
                }
                model2camera = yield modelToCamera_1.default.findOne({ camera_id: camera_id }).exec();
                if (!model2camera) {
                    req.flash("error", "Camera not found");
                    return next(new HttpException_1.default(400, "Camera Not Found", "Plate License"));
                }
                _car = car;
                _color = color;
                //convert date_start to epokh
                let timeStartScientificSymbol = (0, convertTimeEpokh_1.default)(date_start, time);
                let timeEndScientificSymbol = (0, convertTimeEpokh_1.default)(date_end, time);
                //get data from elastic
                response = yield axios_1.default.get(dbUri + '/plate/_search', {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        'from': (page - 1) * perPage,
                        'size': perPage,
                        'query': {
                            'bool': {
                                'filter': [
                                    {
                                        'term': {
                                            'properties.plate_number': car.number_plate
                                        }
                                    },
                                    {
                                        'term': {
                                            'properties.m2c_id': model2camera._id
                                        }
                                    },
                                    {
                                        'range': {
                                            'properties.timestamp': {
                                                'gte': timeStartScientificSymbol,
                                                'lte': timeEndScientificSymbol
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                });
            }
            else {
                response = yield axios_1.default.get(dbUri + '/plate/_search?pretty=true&q=*:*', {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // data: '\n{\n  \n}',
                    data: {
                        'from': (page - 1) * perPage,
                        'size': perPage
                    }
                });
            }
            //create return data to client
            let plates = response.data.hits.hits.map((item) => {
                var _a;
                return {
                    id: item._id,
                    timestamp: item._source.properties.timestamp,
                    plate_number: item._source.properties.plate_number,
                    car: _car,
                    color: _color,
                    isAllowed: (_a = carDB === null || carDB === void 0 ? void 0 : carDB.camera_whitelist) === null || _a === void 0 ? void 0 : _a.includes(item._source.properties.camera_id)
                };
            });
            //return data to client
            return res.status(200).json({
                message: "Success",
                report: response.data
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "Plate License"));
        }
    });
});
exports.default = router;
