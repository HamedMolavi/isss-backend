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
exports.requestForGetPersonnel = exports.dynamicRequestToElasticSearch = void 0;
const axios_1 = __importDefault(require("axios"));
const model_1 = __importDefault(require("./../models/model"));
const error_handler_1 = require("../error/error.handler");
//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"];
const trackerURL = process.env["TREACKER_SEARCH_URL"];
//function for send request to elastic search and get data
function dynamicRequestToElasticSearch(cameras = [], personnels = [], models = [], probability = [], humanCounts = [], timeStart, timeEnd, model, page, perPage, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get hours from epoch time
            let start_hour = -1, end_hour = -1;
            if (timeStart) {
                start_hour = new Date(timeStart).getUTCHours();
                end_hour = new Date(timeEnd).getUTCHours();
            }
            //create json response for client
            let jsonResuest = {};
            jsonResuest.size = perPage;
            jsonResuest.from = perPage * (page - 1) + 1;
            //create json query for elastic search
            jsonResuest.query = {
                bool: {
                    filter: [],
                },
            };
            let response;
            //create url for elastic search with model for name table in elastic search
            let baseurl = "";
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
                if (personnels && personnels.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            personnel_id: personnels,
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
                        range: {
                            confidence: {
                                gte: probability[0],
                                lte: probability[1],
                            },
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
                //add time filter if timeStart and timeEnd is not empty
                //and add script for filter time between two hours
                if (end_hour > -1 && start_hour > -1) {
                    jsonResuest.query.bool.filter.push({
                        script: {
                            script: {
                                source: "ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['timestamp'].value),ZoneId.of('Z')).getHour() >= params.min && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['timestamp'].value),ZoneId.of('Z')).getHour() <= params.max",
                                params: {
                                    min: start_hour,
                                    max: end_hour,
                                },
                            },
                        },
                    });
                }
                //add filter for cameras with time roder
                jsonResuest.sort = [
                    {
                        timestamp: {
                            order: "desc",
                        },
                    },
                ];
                //create url for elastic search with model for name table in elastic search
                baseurl = dbUri + "/" + model + "_log/_search";
            }
            else if (model === "event") {
                //add filter for cameras if model is not event and cameras is not empty
                //cameras ai array string camera id
                if (cameras.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            "log.camera_id": cameras,
                        },
                    });
                }
                //add filter for personnels if personnels is not empty and model is not event
                //personnels ai array string personnel id
                if (personnels && personnels.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            logpersonnel_id: personnels,
                        },
                    });
                }
                //add filter for models if models is not empty and model is not event and model is not event
                //models ai array string model id
                if (models.length > 0) {
                    let model_name = [];
                    for (let modl of models) {
                        let _mod = yield model_1.default.findById(modl).exec();
                        if (_mod) {
                            if (_mod.category == "identification") {
                                model_name.push("face");
                            }
                            else {
                                model_name.push(_mod.category);
                            }
                        }
                    }
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            type: model_name,
                        },
                    });
                }
                //add filter for confidence if confidence is not empty  and model is not event
                //confidence ai array string confidence number
                if (probability.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            "log.confidence": probability,
                        },
                    });
                }
                //add filter for human count if human count is not empty  and human count is not event
                //human count ai array string confidence number
                if (humanCounts.length > 0) {
                    jsonResuest.query.bool.filter.push({
                        terms: {
                            "log.number_of_people": humanCounts,
                        },
                    });
                }
                //add time filter if timeStart and timeEnd is not empty
                if (timeEnd !== "" && timeStart !== "") {
                    jsonResuest.query.bool.filter.push({
                        range: {
                            "log.timestamp": {
                                gte: timeStart,
                                lte: timeEnd,
                            },
                        },
                    });
                }
                //add time filter if timeStart and timeEnd is not empty
                //and add script for filter time between two hours
                if (end_hour > -1 && start_hour > -1) {
                    jsonResuest.query.bool.filter.push({
                        script: {
                            script: {
                                source: "ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['timestamp'].value),ZoneId.of('Z')).getHour() >= params.min && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['timestamp'].value),ZoneId.of('Z')).getHour() <= params.max",
                                params: {
                                    min: start_hour,
                                    max: end_hour,
                                },
                            },
                        },
                    });
                }
                //add filter for cameras with time roder
                jsonResuest.sort = [
                    {
                        "log.timestamp": {
                            order: "desc",
                        },
                    },
                ];
                baseurl = dbUri + "/alerts/_search";
            }
            //send request to elastic search for get all  data with pagination
            response = yield axios_1.default.get(baseurl, {
                headers: {
                    "Content-Type": "application/json",
                },
                data: jsonResuest,
            });
            return response;
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Error while getting data from elastic search"));
        }
    });
}
exports.dynamicRequestToElasticSearch = dynamicRequestToElasticSearch;
function requestForGetPersonnel(personnelId) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield axios_1.default.get(trackerURL, {
            headers: {
                "Content-Type": "application/json",
            },
            // data: '\n{\n  "size": 1,\n  "query": {\n    "match": {\n      "personnel_id": "631731b4d2f90a9d4a49e661"\n    }\n  }, \n  "sort": [\n    {\n      "timestamp": {\n        "order": "desc"\n      }\n    }\n  ]\n}',
            data: {
                size: 1,
                query: {
                    match: {
                        personnel_id: personnelId,
                    },
                },
                sort: [
                    {
                        timestamp: {
                            order: "desc",
                        },
                    },
                ],
            },
        });
        return response;
    });
}
exports.requestForGetPersonnel = requestForGetPersonnel;
