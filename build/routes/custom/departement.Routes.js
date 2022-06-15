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
const departement_1 = __importDefault(require("../../models/departement"));
const authentication_1 = require("../../tools/authentication");
//create router for add to server file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new departement
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name, created_date } = req.body;
            //verify body request
            if (!name) {
                req.flash("error", "Departement name is required");
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
            let newDepartement = new departement_1.default();
            //query for save new departement in DB
            let departement = yield departement_1.default.findOne({ name: name }).exec();
            //retrun error if departement already exists
            if (departement) {
                req.flash("error", "Departement already exists");
                return next({ status: 400, message: "Departement already exists" });
            }
            //fill new departement
            newDepartement = new departement_1.default({
                name: name,
                created_date: created_date
            });
            //query for save new departement in DB
            yield newDepartement.save();
            req.flash("info", "Departement added");
            return res.status(201).json({
                message: "departement created",
                departement: newDepartement
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the departement: ${err}` });
        }
    });
});
//route for get departement with search from DB 
router.get("/find", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get param from url
            let search = req.query.search;
            let strLimit = req.query.limit;
            let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
            if (!search) {
                req.flash("error", "Search is required");
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
            //query for search departement by id from DB
            let departement = yield departement_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found departement
            if (!departement) {
                req.flash("error", "Departement not found");
                return next({ status: 404, message: "Departement not found" });
            }
            //return response to client with departement
            return res.status(200).json({
                message: "Success",
                departement: departement,
                limit: limit,
                total: yield departement_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the departement: ${err}` });
        }
    });
});
//route for get departements list  
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
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get departements list
            let departements = yield departement_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            //return response not found to client if not found departements
            if (!departements) {
                req.flash("error", "Departement not found");
                return next({ status: 404, message: "Departement not found" });
            }
            //return response to client with departements list
            return res.status(200).json({
                message: "Success",
                departements: departements,
                page: page,
                perPage: perPage,
                total: yield departement_1.default.countDocuments().exec(),
                pages: Math.ceil((yield departement_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the departements: ${err}` });
        }
    });
});
//route for get departement by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
            if (!id) {
                req.flash("error", "Departement id is required");
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
            //query for get departement by id from DB
            let departement = yield departement_1.default.findById(id).exec();
            //return response not found to client if not found departement
            if (!departement) {
                req.flash("error", "Departement not found");
                return next({ status: 404, message: "Departement not found" });
            }
            //return response to client with departement
            return res.status(200).json({
                message: "Success",
                departement: departement
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the departement: ${err}` });
        }
    });
});
//add route for edit departement
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                req.flash("error", "Departement id is required");
                return next({ status: 400, message: "Bad request" });
            }
            const departementBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get camera by id from DB and update
            let departement = yield departement_1.default.findByIdAndUpdate(id, departementBody, { new: true }).exec();
            //return response not found to client if not found departement
            if (!departement) {
                req.flash("error", "Departement not found");
                return next({ status: 404, message: "Departement not found" });
            }
            //return response to client with departement
            return res.status(201).json({
                message: "Success",
                departement: departement
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the departement: ${err}` });
        }
    });
});
//add route for delete departement
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
            if (!id) {
                req.flash("error", "Departement id is required");
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
            //query for get departement by id from DB
            let departement = yield departement_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found departement
            if (!departement) {
                req.flash("error", "Departement not found");
                return next({ status: 404, message: "Departement not found" });
            }
            //return response to client with departement
            return res.status(201).json({
                message: "Success",
                departement: departement
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the departement: ${err}` });
        }
    });
});
exports.default = router;
