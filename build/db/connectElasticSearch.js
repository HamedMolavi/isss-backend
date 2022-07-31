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
exports.dynamicRequestToElasticSearch = void 0;
const axios_1 = __importDefault(require("axios"));
const error_handler_1 = require("../error/error.handler");
//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"];
//function for send request to elastic search and get data
function dynamicRequestToElasticSearch(cameras = [], personnels = [], models = [], probability = [], humanCounts = [], timeStart, timeEnd, model, page, perPage, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //create json response for client
            let jsonResuest = {};
            jsonResuest.size = perPage;
            jsonResuest.from = page;
            //create json query for elastic search
            jsonResuest.query = {
                bool: {
                    filter: [],
                },
            };
            //add filter for cameras with time roder
            jsonResuest.sort = [
                {
                    timestamp: {
                        order: "desc",
                    },
                },
            ];
            let response;
            if (model !== "event") {
                //add filter for cameras if model is not event and cameras is not empty
                //cameras ai array string camera id
                if (cameras.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            camera_id: cameras,
                        },
                    });
                }
                //add filter for personnels if personnels is not empty and model is not event
                //personnels ai array string personnel id
                if (personnels.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            personnel_id: personnels,
                        },
                    });
                }
                //add time filter if timeStart and timeEnd is not empty
                if (timeEnd !== "" && timeStart !== "") {
                    jsonResuest.query.bool.filter.push({
                        range: {
                            timestamp: {
                                gte: timeStart,
                                lte: timeEnd,
                            },
                        },
                    });
                }
                //add filter for models if models is not empty and model is not event and model is not event
                //models ai array string model id
                if (models.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            model: models,
                        },
                    });
                }
                //add filter for confidence if confidence is not empty  and model is not event
                //confidence ai array string confidence number
                if (probability.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            confidence: probability,
                        },
                    });
                }
                //add filter for human count if human count is not empty  and human count is not event
                //human count ai array string confidence number
                if (humanCounts.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            number_of_people: humanCounts,
                        },
                    });
                }
                //create url for elastic search with model for name table in elastic search
                let baseurl = "";
                if (model !== "") {
                    baseurl = dbUri + "/" + model + "_log/_search";
                }
                //send request to elastic search for get all  data with pagination
                response = yield axios_1.default.get(baseurl, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: jsonResuest,
                });
            }
            else if (model === "event") {
            }
            return response;
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Error while getting data from elastic search"));
        }
    });
}
exports.dynamicRequestToElasticSearch = dynamicRequestToElasticSearch;
