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
exports.requestToElasticSearch = void 0;
const axios_1 = __importDefault(require("axios"));
const HttpException_1 = __importDefault(require("../error/HttpException"));
//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"];
function requestToElasticSearch(search, timeStart, timeEnd, model, page, perPage, next) {
    return __awaiter(this, void 0, void 0, function* () {
        //create json response for client
        try {
            let response;
            if (search !== "") {
                //get data from elastic
                response = yield axios_1.default.get(dbUri + "/" + model + "_log/_search", {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: {
                        from: page,
                        size: perPage,
                        query: {
                            bool: {
                                filter: [
                                    {
                                        term: {
                                            camera_id: search,
                                        },
                                    },
                                    {
                                        range: {
                                            timestamp: {
                                                gte: timeStart,
                                                lte: timeEnd,
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                });
            }
            else {
                response = yield axios_1.default.get(dbUri + "/" + model + "_log/_search?pretty=true&q=*:*", {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: {
                        from: page,
                        size: perPage,
                    },
                });
            }
            return response;
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "sabotage"));
        }
    });
}
exports.requestToElasticSearch = requestToElasticSearch;
