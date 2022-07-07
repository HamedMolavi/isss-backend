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
const convertTimeEpokh_1 = __importDefault(require("../../../tools/convertTimeEpokh"));
const authentication_1 = require("../../../tools/authentication");
const createlogReport_1 = require("../../../tools/createlogReport");
const elasticsearch_1 = require("../../../db/elasticsearch");
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
            let response;
            let timeStartScientificSymbol = "";
            let timeEndScientificSymbol = "";
            if (search) {
                //get body from request
                const { time, date_start, date_end } = req.body;
                if (!time || !date_start || !date_end) {
                    req.flash("error", "Please fill all fields");
                    return next(new HttpException_1.default(400, "Bad Request", "sabotage"));
                }
                //convert date_start to epokh
                timeStartScientificSymbol = (0, convertTimeEpokh_1.default)(date_start, time);
                timeEndScientificSymbol = (0, convertTimeEpokh_1.default)(date_end, time);
            }
            //get data from elastic
            response = yield (0, elasticsearch_1.requestToElasticSearch)(search, timeStartScientificSymbol, timeEndScientificSymbol, model, page, perPage, next);
            //create json response for client
            let _data = [];
            if (model === "sabotage") {
                _data = yield (0, createlogReport_1.sabotageLogResponse)(response);
            }
            else if (model === "plate") {
                _data = yield (0, createlogReport_1.plateLogResponse)(response);
            }
            else if (model === "human") {
                _data = yield (0, createlogReport_1.humanLogResponse)(response);
            }
            else if (model === "fire") {
                _data = yield (0, createlogReport_1.fireLogResponse)(response);
            }
            else if (model === "face") {
                _data = yield (0, createlogReport_1.faceLogResponse)(response);
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
