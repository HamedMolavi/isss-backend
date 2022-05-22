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
const AI_1 = __importDefault(require("./../../models/AI"));
const authentication_1 = require("./../../tools/authentication");
//create router for add to server file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new AI
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { start, end, thresholdid, minTime, zone, type, minPeople, maxPeople } = req.body;
            //verify body request
            if (!start || !end || !zone || !type) {
                return next({ status: 400, message: "Bad request" });
            }
            if (type === 'FireDetection' && !thresholdid) {
                return next({ status: 400, message: "Bad request" });
            }
            else if (type === 'FaceRecognition' && !minTime && !thresholdid) {
                return next({ status: 400, message: "Bad request" });
            }
            else if (type === 'PeopleCounting' && !minPeople && !maxPeople) {
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            let newAi = new AI_1.default();
            //query for save new AI in DB
            AI_1.default.findOne({ start: start, end: end, type: type }, function (err, Ai) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (Ai) {
                        req.flash("error", "AI already exists");
                        return res.status(201).json({ message: "AI already exists" });
                    }
                    //fill new AI
                    newAi = new AI_1.default({
                        start: start,
                        end: end,
                        thresholdid: thresholdid !== null && thresholdid !== void 0 ? thresholdid : 0,
                        minTime: minTime !== null && minTime !== void 0 ? minTime : null,
                        zone: zone !== null && zone !== void 0 ? zone : null,
                        type: type,
                        minPeople: minPeople !== null && minPeople !== void 0 ? minPeople : 0,
                        maxPeople: maxPeople !== null && maxPeople !== void 0 ? maxPeople : 0
                    });
                    //save new AI in DB
                    yield newAi.save(next);
                    //send response to client with new AI 
                    return res.status(201).json({
                        message: 'AI model created',
                        AI: newAi
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the AI: ${err}` });
        }
    });
});
//route for get AIs list  
router.get("/ais", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get AI from DB
            AI_1.default.find({}, function (err, AIs) {
                if (err) {
                    return next(err);
                }
                if (!AIs) {
                    return next(new Error("Not Found"));
                }
                //send response to client with AI    
                return res.status(200).json({
                    message: 'Success',
                    AIs: AIs
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the AIs: ${err}` });
        }
    });
});
//route for get AI by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get AI by id from DB
            AI_1.default.findById(req.params.id, function (err, Ai) {
                if (err) {
                    return next(err);
                }
                if (!Ai) {
                    return next(new Error("Not Found"));
                }
                //send response to client with AI    
                return res.status(200).json({
                    message: 'Success',
                    AI: Ai
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the AI: ${err}` });
        }
    });
});
//add route for edit AI
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            const AIBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get camera by id from DB
            AI_1.default.findById(id, function (err, ai) {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (!AI_1.default) {
                        return next({ status: 401, message: "Not Found" });
                    }
                    ;
                    //update AI model
                    let updateAI = new AI_1.default({
                        id: id,
                        start: (_a = AIBody.start) !== null && _a !== void 0 ? _a : ai === null || ai === void 0 ? void 0 : ai.start,
                        end: (_b = AIBody.end) !== null && _b !== void 0 ? _b : ai === null || ai === void 0 ? void 0 : ai.end,
                        thresholdid: (_c = AIBody.thresholdid) !== null && _c !== void 0 ? _c : ai === null || ai === void 0 ? void 0 : ai.thresholdid,
                        minTime: (_d = AIBody.minTime) !== null && _d !== void 0 ? _d : ai === null || ai === void 0 ? void 0 : ai.minTime,
                        zone: (_e = AIBody.zone) !== null && _e !== void 0 ? _e : ai === null || ai === void 0 ? void 0 : ai.zone,
                        type: (_f = AIBody.type) !== null && _f !== void 0 ? _f : ai === null || ai === void 0 ? void 0 : ai.type,
                        minPeople: (_g = AIBody.minPeople) !== null && _g !== void 0 ? _g : ai === null || ai === void 0 ? void 0 : ai.minPeople,
                        maxPeople: (_h = AIBody.maxPeople) !== null && _h !== void 0 ? _h : ai === null || ai === void 0 ? void 0 : ai.maxPeople
                    });
                    //save edit AI in DB
                    yield updateAI.set(next);
                    //return response with message and AI
                    return res.status(201).json({
                        message: 'AI Edited',
                        AI: updateAI
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the AI: ${err}` });
        }
    });
});
//add route for delete AI
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get AI by id from DB
            AI_1.default.findById(id, function (err, Ai) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (!Ai) {
                        return next(new Error("Not Found"));
                    }
                    //delete AI in DB
                    yield Ai.delete(next);
                    //send response to client with AI
                    return res.status(201).json({
                        message: 'AI Deleted',
                        AI: {}
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the AI: ${err}` });
        }
    });
});
exports.default = router;
