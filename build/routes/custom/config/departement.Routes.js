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
const error_handler_1 = require("../../../error/error.handler");
const department_1 = __importDefault(require("../../../models/department"));
const authentication_1 = require("./../../../tools/authentication");
//get user role from enviroment variable
const const_role = process.env.const_role || "user";
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
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name, created_date } = req.body;
            //verify body request
            if (!name) {
                req.flash("error", "Departement name is required");
                return next(new error_handler_1.ApiError(400, "Departement name is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            let newDepartement = new department_1.default();
            //query for save new departement in DB
            let departement = yield department_1.default.findOne({ name: name }).exec();
            //retrun error if departement already exists
            if (departement) {
                req.flash("error", "Departement already exists");
                return next(new error_handler_1.ApiError(400, "Departement already exists"));
            }
            //fill new departement
            newDepartement = new department_1.default({
                name: name,
                created_date: created_date,
            });
            //query for save new departement in DB
            yield newDepartement.save();
            req.flash("info", "Departement added");
            return res.status(201).json({
                success: true,
                data: newDepartement,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get departements list
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            let search = req.query.search || "";
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get departements list
            let departements = [];
            if (!(search && search.length > 0)) {
                departements = yield department_1.default.find({
                    name: { $regex: search, $options: "i" },
                })
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            else {
                departements = yield department_1.default.find({})
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            //return response not found to client if not found departements
            if (!departements) {
                req.flash("error", "Departement not found");
                return next(new error_handler_1.ApiError(404, "Departement not found"));
            }
            //return response to client with departements list
            return res.status(200).json({
                success: true,
                data: departements,
                page: page,
                perPage: perPage,
                total: yield department_1.default.countDocuments().exec(),
                pages: Math.ceil((yield department_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
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
                return next(new error_handler_1.ApiError(400, "Departement id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get departement by id from DB
            let departement = yield department_1.default.findById(id).exec();
            //return response not found to client if not found departement
            if (!departement) {
                req.flash("error", "Departement not found");
                return next(new error_handler_1.ApiError(404, "Departement not found"));
            }
            //return response to client with departement
            return res.status(200).json({
                success: true,
                data: departement,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//add route for edit departement
router.patch("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                req.flash("error", "Departement id is required");
                return next(new error_handler_1.ApiError(400, "Department id is required"));
            }
            const departementBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get camera by id from DB and update
            let departement = yield department_1.default.findByIdAndUpdate(id, departementBody, { new: true }).exec();
            //return response not found to client if not found departement
            if (!departement) {
                req.flash("error", "Departement not found");
                return next(new error_handler_1.ApiError(404, "Departement not found"));
            }
            //return response to client with departement
            return res.status(201).json({
                success: true,
                data: departement,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
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
                return next(new error_handler_1.ApiError(400, "Departement id is required"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get departement by id from DB
            let departement = yield department_1.default.findByIdAndDelete(id).exec();
            //return response not found to client if not found departement
            if (!departement) {
                req.flash("error", "Departement not found");
                return next(new error_handler_1.ApiError(404, "Departement not found"));
            }
            //return response to client with departement
            return res.status(201).json({
                success: true,
                data: departement,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
