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
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get model from url request
            //let model = req.params.model;
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
            //get searchName from url
            let searchName = req.query.name || "";
            let timeStartTimeStamp = "";
            let timeEndTimeStamp = "";
            if (search) {
                //get body from request
                const { time, date_start, date_end } = req.body;
                if (time && date_start && date_end) {
                    //convet time to timeStamp
                    timeStartTimeStamp = (0, convertTime_1.dataTime2TimeStamp)(date_start, time).toString();
                    timeEndTimeStamp = (0, convertTime_1.dataTime2TimeStamp)(date_end, time).toString();
                }
            }
            let _data = [];
            //get event data from elastic search
            response = yield (0, elasticsearch_1.requestToElasticSearchEvent)(search, timeStartTimeStamp, timeEndTimeStamp, page, perPage, next, searchName);
            //create json response for client
            _data = yield (0, createlogReport_1.eventDepartmentLogResponse)(response);
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
