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
const section_1 = __importDefault(require("../../models/section"));
const authentication_1 = require("../../tools/authentication");
//create router for add to routes file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new section
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name, departement_id } = req.body;
            //verify body request
            if (!name || !departement_id) {
                req.flash("error", "Please enter all fields");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Your token has expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for save new section in DB
            let section = yield section_1.default.findOne({ name: name }).exec();
            //check if section exist
            if (section) {
                req.flash("error", "Section already exist");
                return next({ status: 200, message: "Section already exist" });
            }
            //set section data
            let newSection = new section_1.default();
            newSection.name = name;
            newSection.departement_id = departement_id;
            //save section in DB
            yield newSection.save();
            req.flash("info", "Section has been registered");
            //send response
            return res.status(201).json({
                message: "section created",
                section: newSection
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the section: ${err}` });
        }
    });
});
//route for get section with search from DB 
router.get("/find", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get param from url
            let search = req.query.search;
            let strLimit = req.query.limit;
            let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
            if (!search) {
                req.flash("error", "Please enter search");
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
            //query for search section by id from DB
            let section = yield section_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found sedction
            if (!section) {
                req.flash("error", "Section not found");
                return next(new Error("Not Found"));
            }
            //return response to client with section
            return res.status(200).json({
                message: "Success",
                section: section,
                limit: limit,
                total: yield section_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the section: ${err}` });
        }
    });
});
//route for get sections list  
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Your token has expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get sections from DB
            let sections = yield section_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            //return not found if sections not exist
            if (!sections) {
                req.flash("error", "Section not found");
                return next(new Error("Not Found"));
            }
            //send response
            return res.status(200).json({
                message: "Success",
                sections: sections,
                page: page,
                perPage: perPage,
                total: yield section_1.default.countDocuments().exec(),
                pages: Math.ceil((yield section_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the sections: ${err}` });
        }
    });
});
//route for get section by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter all fields");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Your token has expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get section by id from DB
            let section = yield section_1.default.findById(id).exec();
            //return not found if section not exist
            if (!section) {
                req.flash("error", "Section not found");
                return next(new Error("Not Found"));
            }
            //send response
            return res.status(200).json({
                message: "Success",
                section: section
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the section: ${err}` });
        }
    });
});
//add route for edit section
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter all fields");
                return next({ status: 400, message: "Bad request" });
            }
            //get jason from body request
            const sectionBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Your token has expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get section by id from DB
            let section = yield section_1.default.findByIdAndUpdate(id, sectionBody, { new: true }).exec();
            //return not found if section not exist
            if (!section) {
                req.flash("error", "Section not found");
                return next(new Error("Not Found"));
            }
            //send response
            return res.status(201).json({
                message: "Success",
                section: section
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the section: ${err}` });
        }
    });
});
//add route for delete section
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter id");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Your token has expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get section by id from DB
            let section = yield section_1.default.findByIdAndDelete(id).exec();
            //return not found if section not exist
            if (!section) {
                req.flash("error", "Section not found");
                return next(new Error("Not Found"));
            }
            //send response
            return res.status(201).json({
                message: "Success",
                section: section
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the section: ${err}` });
        }
    });
});
exports.default = router;
