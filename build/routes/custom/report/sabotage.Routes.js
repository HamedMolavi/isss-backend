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
const HttpException_1 = __importDefault(require("../../../error/HttpException"));
const axios_1 = __importDefault(require("axios"));
const convertTimeEpokh_1 = __importDefault(require("../../../tools/convertTimeEpokh"));
const authentication_1 = require("../../../tools/authentication");
const camera_1 = __importDefault(require("../../../models/camera"));
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
router.get("", function (req, res, next) {
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
            console.log(search);
            if (search !== "") {
                //get body from request
                const { time, date_start, date_end } = req.body;
                if (!time || !date_start || !date_end) {
                    req.flash("error", "Please fill all fields");
                    return next(new HttpException_1.default(400, "Bad Request", "sabotage"));
                }
                //convert date_start to epokh
                let timeStartScientificSymbol = (0, convertTimeEpokh_1.default)(date_start, time);
                let timeEndScientificSymbol = (0, convertTimeEpokh_1.default)(date_end, time);
                //get data from elastic
                response = yield axios_1.default.get(dbUri + '/sabotage_log/_search', {
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
                                            'properties.camera_id': search
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
                response = yield axios_1.default.get(dbUri + '/sabotage_log/_search?pretty=true&q=*:*', {
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
            //ceate json response
            let data;
            data = response.data.hits.hits.map((item) => __awaiter(this, void 0, void 0, function* () {
                let _time = new Date(item._source.properties.timestamp).getTime();
                let model2camera = yield modelToCamera_1.default.findById('62bfe6ae54d90e82d9ba598b').exec();
                let camera = yield camera_1.default.findById(model2camera === null || model2camera === void 0 ? void 0 : model2camera.camera_id).exec();
                let result = {
                    camera: camera === null || camera === void 0 ? void 0 : camera.name,
                    time: _time,
                };
                // let camera = await Camera.findById('62c009a3fb115e110df9b460').exec();
                // console.log(camera);
                // let model2camera = await ModelToCamera.findOne({ _id: item._source.properties.m2c_id }).exec();
                data.push(result);
                console.log(result);
                //return result;
            }));
            console.log(data);
            //return data to client
            return res.status(200).json({
                message: "Success",
                data: data
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "sabotage"));
        }
    });
});
exports.default = router;
