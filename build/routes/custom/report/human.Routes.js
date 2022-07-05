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
const modelToCamera_1 = __importDefault(require("../../../models/modelToCamera"));
const camera_1 = __importDefault(require("../../../models/camera"));
const schedule_1 = __importDefault(require("./../../../models/schedule"));
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
//route for get people counting list  
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
                response = yield axios_1.default.get(dbUri + '/human_log/_search', {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        'from': page,
                        'size': perPage,
                        'query': {
                            'bool': {
                                'filter': [
                                    {
                                        'term': {
                                            'camera_id': search
                                        }
                                    },
                                    {
                                        'range': {
                                            'timestamp': {
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
                response = yield axios_1.default.get(dbUri + '/human_log/_search?pretty=true&q=*:*', {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // data: '\n{\n  \n}',
                    data: {
                        'from': page,
                        'size': perPage
                    }
                });
            }
            //ceate json response
            let _data = [];
            for (let i = 0; i < response.data.hits.hits.length; i++) {
                //get modelToCamera from mongo db by id
                let model2camera = yield modelToCamera_1.default.findById(response.data.hits.hits[i]._source.model_camera_id).exec();
                //get schedule from mongo db by model_camera_id for compare with max_people
                let schedule = yield schedule_1.default.findOne({ model_camera_id: model2camera === null || model2camera === void 0 ? void 0 : model2camera._id }).exec();
                //get camera from mongo db by id for get camera name
                let camera = yield camera_1.default.findById(response.data.hits.hits[i]._source.camera_id).exec();
                let result = {
                    camera_id: response.data.hits.hits[i]._source.camera_id,
                    camera: camera === null || camera === void 0 ? void 0 : camera.name,
                    time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
                    NumberOfPeople: schedule.config.max_people >= response.data.hits.hits[i].number_of_people ? true : false
                };
                _data.push(yield result);
            }
            ;
            //return data to client
            return res.status(200).json({
                message: "Success",
                data: _data,
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "sabotage"));
        }
    });
});
exports.default = router;
