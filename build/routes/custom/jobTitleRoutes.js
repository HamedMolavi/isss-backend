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
                req.flash("error", "Please enter a name");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token has been expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for save new jobTitle in DB
            let jobTitle = yield jobTitle_1.default.findOne({ name: name }).exec();
            //check if jobTitle is exist
            if (jobTitle) {
                req.flash("error", "JobTitle is exist");
                return next({ status: 200, message: "jobTitle already exists" });
            }
            //set value for new jobTitle
            let newjobTitle = new jobTitle_1.default();
            newjobTitle.name = name;
            //save new jobTitle in DB
            yield newjobTitle.save();
            //send response
            return res.status(201).json({
                message: "jobTitle has been created",
                jobTitle: newjobTitle
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the jobTitle: ${err}` });
        }
    });
});
//route for get jobTitle with search from DB 
router.get("/find", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get param from url
            let search = req.query.search;
            let strLimit = req.query.limit;
            let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
            if (!search) {
                req.flash("error", "JobTitle id is required");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for search JobTitle by id from DB
            let jobTitle = yield jobTitle_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found JobTitle
            if (!jobTitle) {
                req.flash("error", "JobTitle not found");
                return next(new Error("Not Found"));
            }
            //return response to client with jobTitle
            return res.status(200).json({
                message: "Success",
                jobTitle: jobTitle,
                limit: limit,
                total: yield jobTitle_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the JobTitle: ${err}` });
        }
    });
});
//route for get jobTitle list  
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.PerPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token has been expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get jobTitle from DB
            let jobTitles = yield jobTitle_1.default.find().limit(perPage).skip(perPage * (page - 1)).exec();
            //return response not found to client if not found jobTitles
            if (!jobTitles) {
                req.flash("error", "Not found jobTitles");
                return next({ status: 404, message: "Not found jobTitles" });
            }
            //send response
            return res.status(200).json({
                message: "Success",
                jobTitles: jobTitles,
                page: page,
                perPage: perPage,
                total: yield jobTitle_1.default.countDocuments().exec(),
                pages: Math.ceil((yield jobTitle_1.default.countDocuments().exec()) / perPage)
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
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "JobTitle id is required");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token has been expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get jobTitle by id from DB
            let jobTitle = yield jobTitle_1.default.findById(id).exec();
            //return response not found to client if not found jobTitle
            if (!jobTitle) {
                req.flash("error", "JobTitle not found");
                return next(new Error("Not Found"));
            }
            //send response
            return res.status(200).json({
                message: "Success",
                jobTitle: jobTitle
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
            if (!id) {
                req.flash("error", "JobTitle id is required");
                return next({ status: 400, message: "Bad request" });
            }
            //get body from request
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
            let jobTitle = yield jobTitle_1.default.findByIdAndUpdate(id, jobTitleBody, { new: true }).exec();
            //return response not found to client if not found jobTitle
            if (!jobTitle) {
                req.flash("error", "JobTitle not found");
                return next(new Error("Not Found"));
            }
            //send response
            return res.status(201).json({
                message: "Success",
                jobTitle: jobTitle
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
            //get id from url
            let id = req.params.id;
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token has been expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get jobTitle by id from DB
            let jobTitle = yield jobTitle_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found jobTitle
            if (!jobTitle) {
                req.flash("error", "JobTitle not found");
                return next(new Error("Not Found"));
            }
            //send response
            return res.status(201).json({
                message: "Success",
                jobTitle: jobTitle
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the jobTitle: ${err}` });
        }
    });
});
exports.default = router;
