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
const camera_1 = __importDefault(require("../../../models/camera"));
const departement_1 = __importDefault(require("../../../models/departement"));
const section_1 = __importDefault(require("../../../models/section"));
const authentication_1 = require("../../../tools/authentication");
//create router for add to server file
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//route for get departementfile list
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
            //query for get departements list
            let departments = yield departement_1.default.find().exec();
            //query for get all section from DB
            let sections = yield section_1.default.find().exec();
            //query for get all camera from DB
            let cameras = yield camera_1.default.find().exec();
            //return response not found to client if not found departements
            if (!departments) {
                req.flash("error", "Departement not found");
                return next(new error_handler_1.ApiError(404, "Departement not found"));
            }
            let response = [];
            //loop for get sort departments and section in json response
            for (let department of departments) {
                let childrenSection = [];
                for (let section of sections) {
                    console.log(sections);
                    if (section.departement_id == department._id) {
                        let childrenCamera = [];
                        for (let camera of cameras) {
                            if (camera.section_id == section._id) {
                                childrenCamera.push({
                                    _id: camera._id,
                                    name: camera.name,
                                    type: "camera",
                                    url: camera.url,
                                    username: camera.username,
                                    password: camera.password,
                                    ip: camera.ip,
                                    is_enabled: camera.is_enabled,
                                });
                            }
                        }
                        console.log(childrenCamera);
                        childrenSection.push({
                            _id: section._id,
                            name: section.name,
                            type: "section",
                            children: childrenCamera,
                        });
                    }
                    //sort section by name
                    childrenSection.sort((a, b) => {
                        if (a.name < b.name) {
                            return -1;
                        }
                        if (a.name > b.name) {
                            return 1;
                        }
                        return 0;
                    });
                }
                response.push({
                    _id: department._id,
                    name: department.name,
                    type: "department",
                    children: childrenSection,
                });
            }
            //sort departement by name
            response.sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });
            //return response to client with departements file list
            return res.status(200).json({
                success: true,
                data: response,
                page: page,
                perPage: perPage,
                total: yield departement_1.default.countDocuments().exec(),
                pages: Math.ceil((yield departement_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
