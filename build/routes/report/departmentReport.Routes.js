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
const authentication_1 = require("../../tools/authentication");
const createlogReport_1 = require("../../tools/createlogReport");
const convertTime_1 = require("../../tools/convertTime");
const error_handler_1 = require("../../error/error.handler");
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
//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"];
//route for get sabotage list
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get model from url request
            //let model = req.params.model;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            page = ((page - 1) * perPage) + 1;
            //get search from url
            let search = req.query.search || "";
            let response;
            //get searchName from url
            let searchName = req.query.name || "";
            let timeEpokhStart = "";
            let timeEpokhEnd = "";
            let _cameras = [];
            let _models = [];
            if (search) {
                //get body from request
                const { time_start, time_end, date_start, date_end, cameras, models } = req.body;
                _models = models !== null && models !== void 0 ? models : [];
                _cameras = cameras !== null && cameras !== void 0 ? cameras : [];
                if (time_start && time_end && date_start && date_end) {
                    //convet time to timeStamp
                    timeEpokhStart = (0, convertTime_1.date2Epokh)(date_start, time_start);
                    timeEpokhEnd = (0, convertTime_1.date2Epokh)(date_end, time_end);
                }
            }
            let _data = [];
            //get event data from elastic search
            //   response = await requestToElasticSearchEvent(
            //     _cameras,
            //     _models,
            //     search,
            //     timeEpokhStart,
            //     timeEpokhEnd,
            //     page,
            //     perPage,
            //     next,
            //     searchName
            //   );
            if (!response) {
                req.flash("error", "Data is null or undefined");
                return next(new error_handler_1.ApiError(404, "Data is null or undefined"));
            }
            //create json response for client
            _data = yield (0, createlogReport_1.eventDepartmentLogResponse)(response);
            //return data to client
            return res.status(200).json({
                success: true,
                data: _data,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error ," + err));
        }
    });
});
exports.default = router;
