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
const jobTitle_1 = __importDefault(require("./../../models/jobTitle"));
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
//add route for register new jobTitle
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name } = req.body;
            //verify body request
            if (!name) {
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
            let newjobTitle = new jobTitle_1.default();
            //query for save new jobTitle in DB
            jobTitle_1.default.findOne({ name: name }, function (err, jobTitle) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (jobTitle) {
                        req.flash("error", "jobTitle already exists");
                        return res.status(201).json({ message: "jobTitle already exists" });
                    }
                    //fill new jobTitle
                    newjobTitle = new jobTitle_1.default({
                        name: name
                    });
                    //save new jobTitle in DB
                    yield newjobTitle.save(next);
                    //send response to client with new jobTitle 
                    return res.status(201).json({
                        message: 'jobTitle created',
                        jobTitle: newjobTitle
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the jobTitle: ${err}` });
        }
    });
});
//route for get jobTitle list  
router.get("/jobtitles", function (req, res, next) {
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
            //query for get jobTitle from DB
            jobTitle_1.default.find({}, function (err, jobTitles) {
                if (err) {
                    return next(err);
                }
                if (!jobTitles) {
                    return next(new Error("Not Found"));
                }
                //send response to client with jobTitle    
                return res.status(200).json({
                    message: 'Success',
                    jobTitles: jobTitles
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the jobTitle: ${err}` });
        }
    });
});
//route for get jobTitle by id from DB 
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
            //query for get jobTitle by id from DB
            jobTitle_1.default.findById(req.params.id, function (err, jobTitle) {
                if (err) {
                    return next(err);
                }
                if (!jobTitle) {
                    return next(new Error("Not Found"));
                }
                //send response to client with jobTitle    
                return res.status(200).json({
                    message: 'Success',
                    jobTitle: jobTitle
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the jobTitle: ${err}` });
        }
    });
});
//add route for edit jobTitle
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            const jobTitleBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get jobTitle by id from DB
            jobTitle_1.default.findById(id, function (err, jobTitle) {
                var _a;
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (!jobTitle) {
                        return next({ status: 401, message: "Not Found" });
                    }
                    ;
                    //update jobTitle model
                    let updateJobTitle = new jobTitle_1.default({
                        id: id,
                        name: (_a = jobTitleBody.name) !== null && _a !== void 0 ? _a : jobTitle.name,
                    });
                    //save edit jobTitle in DB
                    yield updateJobTitle.set(next);
                    //return response with message and jobTitle
                    return res.status(201).json({
                        message: 'jobTitle Edited',
                        jobTitle: updateJobTitle
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the jobTitle: ${err}` });
        }
    });
});
//add route for delete jobTitle
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
            //query for get jobTitle by id from DB
            jobTitle_1.default.findById(id, function (err, jobTitle) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (!jobTitle) {
                        return next(new Error("Not Found"));
                    }
                    //delete jobTitle in DB
                    yield jobTitle.delete(next);
                    //send response to client with jobTitle
                    return res.status(201).json({
                        message: 'jobTitle Deleted',
                        jobTitle: {}
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the jobTitle: ${err}` });
        }
    });
});
exports.default = router;
