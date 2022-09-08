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
exports.requestToElasticSearchEvent = exports.requestToElasticSearch = void 0;
const axios_1 = __importDefault(require("axios"));
const error_handler_1 = require("../error/error.handler");
//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"];
//send request to elastic search and get data
function requestToElasticSearch(cameras, search, timeStart, timeEnd, model, page, perPage, next) {
    return __awaiter(this, void 0, void 0, function* () {
        //create json response for client
        try {
            let response;
            if (search !== "") {
                //get data from elastic
                //format search to elastic search
                response = yield axios_1.default.get(dbUri + "/" + model + "_log/_search", {
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
                                        'terms': {
                                            'camera_id': cameras
                                        }
                                    },
                                    {
                                        'range': {
                                            'timestamp': {
                                                'gte': timeStart,
                                                'lte': timeEnd
                                            }
                                        }
                                    }
                                ]
                            }
                        },
                        'sort': [
                            {
                                'timestamp': {
                                    'order': 'desc'
                                }
                            }
                        ]
                    }
                });
            }
            else {
                //send request to elastic search for get all  data with pagination
                response = yield axios_1.default.get(dbUri + "/" + model + "_log/_search?pretty=true&q=*:*", {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: {
                        'from': page,
                        'size': perPage,
                        'sort': [
                            {
                                'timestamp': {
                                    'order': "desc",
                                },
                            },
                        ],
                    },
                });
            }
            return response;
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Error while getting data from elastic search"));
        }
    });
}
exports.requestToElasticSearch = requestToElasticSearch;
function requestToElasticSearchEvent(cameras, models, search, timeStart, timeEnd, page, perPage, next, searchName) {
    return __awaiter(this, void 0, void 0, function* () {
        //create json response for client
        try {
            let response;
            if (search !== "") {
                //get data from elastic
                //format search to elastic search
                if (searchName === "all") {
                    response = yield axios_1.default.get(dbUri + "/alerts/_search", {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        data: {
                            'from': page,
                            'size': perPage,
                            'query': {
                                'bool': {
                                    'filter': [
                                        {
                                            'term': {
                                                "alerts.labels.camera_id": cameras
                                            },
                                        },
                                        {
                                            'term': {
                                                "alerts.labels.module": models,
                                            },
                                        },
                                        {
                                            'range': {
                                                "alerts.labels.timestamp": {
                                                    gte: timeStart,
                                                    lte: timeEnd,
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                            'sort': [
                                {
                                    "alerts.labels.timestamp.keyword": {
                                        missing: "_last",
                                    },
                                },
                            ],
                        },
                    });
                }
                else if (searchName === "camera") {
                    response = yield axios_1.default.get(dbUri + "/alerts/_search", {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        data: {
                            'from': page,
                            'size': perPage,
                            'query': {
                                'match': {
                                    "alerts.labels.camera_id": cameras,
                                },
                            },
                            'sort': [
                                {
                                    "alerts.labels.timestamp.keyword": {
                                        missing: "_last",
                                    },
                                },
                            ],
                        },
                    });
                }
                else if (searchName === "date") {
                    response = yield axios_1.default.get(dbUri + "/alerts/_search", {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        data: {
                            'from': page,
                            'size': perPage,
                            'query': {
                                'bool': {
                                    'filter': [
                                        {
                                            'term': {
                                                "alerts.labels.timestamp": search,
                                            },
                                        },
                                        {
                                            'range': {
                                                "alerts.labels.timestamp": {
                                                    'gte': timeStart,
                                                    'lte': timeEnd,
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                            'sort': [
                                {
                                    "alerts.labels.timestamp.keyword": {
                                        missing: "_last",
                                    },
                                },
                            ],
                        },
                    });
                }
                else if (searchName === "ai") {
                    response = yield axios_1.default.get(dbUri + "/alerts/_search", {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        data: {
                            'from': page,
                            'size': perPage,
                            'query': {
                                'bool': {
                                    'filter': [
                                        {
                                            'terms': {
                                                "alerts.labels.module": models,
                                            },
                                        },
                                    ],
                                },
                            },
                            'sort': [
                                {
                                    "alerts.labels.timestamp.keyword": {
                                        missing: "_last",
                                    },
                                },
                            ],
                        },
                    });
                }
            }
            else {
                //send request to elastic search for get all  data with pagination
                response = yield axios_1.default.get(dbUri + "/alerts/_search?pretty=true&q=*:*", {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: {
                        'from': page,
                        'size': perPage,
                    },
                });
            }
            return response;
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Error while getting data from elastic search"));
        }
    });
}
exports.requestToElasticSearchEvent = requestToElasticSearchEvent;
