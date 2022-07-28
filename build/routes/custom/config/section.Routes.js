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
const section_1 = __importDefault(require("./../../../models/section"));
const authentication_1 = require("./../../../tools/authentication");
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
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { name, departement_id } = req.body;
            //verify body request
            if (!name || !departement_id) {
                req.flash("error", "Please enter all fields");
                return next(new error_handler_1.ApiError(400, "Please enter all fields"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for save new section in DB
            let section = yield section_1.default.findOne({ name: name }).exec();
            //check if section exist
            if (section) {
                req.flash("error", "Section already exist");
                return next(new error_handler_1.ApiError(400, "Section already exist"));
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
                success: true,
                data: newSection,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get sections list
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
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get sections from DB
            let sections = [];
            if (!(search && search.length > 0)) {
                sections = yield section_1.default.find({
                    name: { $regex: search, $options: "i" },
                })
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            else {
                sections = yield section_1.default.find({})
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            //return not found if sections not exist
            if (!sections) {
                req.flash("error", "Section not found");
                return next(new error_handler_1.ApiError(404, "Section not found"));
            }
            //send response
            return res.status(200).json({
                success: true,
                data: sections,
                page: page,
                perPage: perPage,
                total: yield section_1.default.countDocuments().exec(),
                pages: Math.ceil((yield section_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
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
                return next(new error_handler_1.ApiError(400, "Please enter all fields"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get section by id from DB
            let section = yield section_1.default.findById(id).exec();
            //return not found if section not exist
            if (!section) {
                req.flash("error", "Section not found");
                return next(new error_handler_1.ApiError(404, "Section not found"));
            }
            //send response
            return res.status(200).json({
                success: true,
                data: section,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
//add route for edit section
router.patch("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter all fields");
                return next(new error_handler_1.ApiError(400, "Please enter all fields"));
            }
            //get jason from body request
            const sectionBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get section by id from DB
            let section = yield section_1.default.findByIdAndUpdate(id, sectionBody, {
                new: true,
            }).exec();
            //return not found if section not exist
            if (!section) {
                req.flash("error", "Section not found");
                return next(new error_handler_1.ApiError(404, "Section not found"));
            }
            //send response
            return res.status(201).json({
                message: "Success",
                section: section,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
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
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get section by id from DB
            let section = yield section_1.default.findByIdAndDelete(id).exec();
            //return not found if section not exist
            if (!section) {
                req.flash("error", "Section not found");
                return next(new error_handler_1.ApiError(404, "Section not found"));
            }
            //send response
            return res.status(201).json({
                message: "Success",
                section: section,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
exports.default = router;
