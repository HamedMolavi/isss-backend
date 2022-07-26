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
const authentication_1 = require("../../../tools/authentication");
const createlogReport_1 = require("../../../tools/createlogReport");
const elasticsearch_1 = require("../../../db/elasticsearch");
const convertTime_1 = require("../../../tools/convertTime");
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
router.get("/:model", function (req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get model from url request
            let model = req.params.model;
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
            //get searchName from url
            let searchName = req.query.name || "";
            let response;
            let timeStartScientificSymbol = "";
            let timeEndScientificSymbol = "";
            let timeStartTimeStamp = "";
            let timeEndTimeStamp = "";
            let _allowed = undefined;
            let _carBrand = null;
            let _carColor = null;
            let _owner = null;
            if (search) {
                //get body from request
                const { time_start, time_end, date_start, date_end, car_brand, car_color, owner, allowed, } = req.body;
                _allowed = (_a = Boolean(allowed)) !== null && _a !== void 0 ? _a : undefined;
                _carBrand = car_brand !== null && car_brand !== void 0 ? car_brand : null;
                _carColor = car_color !== null && car_color !== void 0 ? car_color : null;
                _owner = owner !== null && owner !== void 0 ? owner : null;
                if (time_start && time_end && date_start && date_end) {
                    //convert date_start to epokh
                    timeStartScientificSymbol = (0, convertTime_1.date2Epokh)(date_start, time_start);
                    timeEndScientificSymbol = (0, convertTime_1.date2Epokh)(date_end, time_end);
                    //convet time to timeStamp
                    timeStartTimeStamp = (0, convertTime_1.dataTime2TimeStamp)(date_start, time_start).toString();
                    timeEndTimeStamp = (0, convertTime_1.dataTime2TimeStamp)(date_end, time_end).toString();
                }
                // else
                // if(!time_start || !time_end || !date_start || !date_end ){
                //   req.flash("error", "Time and date is required");
                //   return next(new HttpException(400, "Time and date is required", model));
                // }
            }
            let _data = [];
            if (model === "event") {
                //get event data from elastic search
                response = yield (0, elasticsearch_1.requestToElasticSearchEvent)(search, timeStartTimeStamp, timeEndTimeStamp, page, perPage, next, searchName);
                //create json response for client
                _data = yield (0, createlogReport_1.eventLogResponse)(response);
            }
            else {
                //get log for other models data from elastic
                response = yield (0, elasticsearch_1.requestToElasticSearch)(search, timeStartScientificSymbol, timeEndScientificSymbol, model, page, perPage, next);
                //create json response for client
                if (model === "sabotage") {
                    _data = yield (0, createlogReport_1.sabotageLogResponse)(response);
                }
                else if (model === "plate") {
                    console.log(_owner);
                    if ((_carBrand === null || _carColor === null || _owner === null) &&
                        search) {
                        req.flash("error", "Car brand, car color and owner is required");
                        return next(new HttpException_1.default(400, "Car brand, car color and owner is required", model));
                    }
                    _data = yield (0, createlogReport_1.plateLogResponse)(response, _carBrand, _carColor, _owner, _allowed, search);
                }
                else if (model === "human") {
                    _data = yield (0, createlogReport_1.humanLogResponse)(response, _allowed);
                }
                else if (model === "fire") {
                    _data = yield (0, createlogReport_1.fireLogResponse)(response);
                }
                else if (model === "face") {
                    _data = yield (0, createlogReport_1.faceLogResponse)(response);
                }
            }
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
