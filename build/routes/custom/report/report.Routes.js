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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authentication_1 = require("../../../tools/authentication");
const createlogReport_1 = require("../../../tools/createlogReport");
const convertTime_1 = require("../../../tools/convertTime");
const error_handler_1 = require("../../../error/error.handler");
const connectElasticSearch_1 = require("../../../db/connectElasticSearch");
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
router.post("/:model", function (req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get model from url request
            let model = req.params.model;
            //send error if model is not defined
            if (model !== "face" && model !== "fire" && model !== "human" && model !== "plate" && model !== "sabotage") {
                req.flash("error", "Model not found");
                return next(new error_handler_1.ApiError(404, "Model not found"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            page = (page - 1) * perPage + 1;
            //get search from url
            let search = req.query.search || "";
            let response;
            let timeEpokhStart, timeEpokhEnd = "";
            let _allowed = undefined;
            let _carBrand, _carColor, _owner = null;
            let _cameras, _models, _personnels = [];
            let _probabilities, _humanCounts = [];
            if (search) {
                //get body from request
                const { time_start, time_end, date_start, date_end, car_brand, car_color, owner, allowed, cameras, models, personnels, probabilities, humanCounts } = req.body;
                _humanCounts = humanCounts;
                _personnels = personnels;
                _cameras = cameras;
                _models = models;
                _probabilities = probabilities;
                _allowed = (_a = Boolean(allowed)) !== null && _a !== void 0 ? _a : undefined;
                _carBrand = car_brand !== null && car_brand !== void 0 ? car_brand : null;
                _carColor = car_color !== null && car_color !== void 0 ? car_color : null;
                _owner = owner !== null && owner !== void 0 ? owner : null;
                if (time_start && time_end && date_start && date_end) {
                    //convert date_start to epokh
                    if (!date_start.includes("/") || !date_end.includes("/")) {
                        req.flash("error", "Date format is not correct");
                        next(new error_handler_1.ApiError(400, "Date format is not correct"));
                    }
                    timeEpokhStart = (0, convertTime_1.date2Epokh)(date_start, time_start);
                    timeEpokhEnd = (0, convertTime_1.date2Epokh)(date_end, time_end);
                }
            }
            let _data = [];
            //get log for other models data from elastic
            response = yield (0, connectElasticSearch_1.dynamicRequestToElasticSearch)(_cameras, _personnels, _models, _probabilities, _humanCounts, timeEpokhStart, timeEpokhEnd, model, page, perPage, next);
            if (!response) {
                req.flash("error", "Data is null or undefined");
                return next(new error_handler_1.ApiError(404, "Data is null or undefined"));
            }
            //create json response for client
            if (model === "sabotage") {
                _data = yield (0, createlogReport_1.sabotageLogResponse)(response);
            }
            else if (model === "plate") {
                if ((_carBrand === null || _carColor === null || _owner === null) &&
                    search) {
                    return next(new error_handler_1.ApiError(400, `car_brand, car_color, owner is required`));
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
            //return data to client
            return res.status(200).json({
                success: true,
                data: _data,
                total: response.data.hits.total.value
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error ," + err));
        }
    });
});
exports.default = router;
