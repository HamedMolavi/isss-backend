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
const department_1 = __importDefault(require("../../../models/department"));
const section_1 = __importDefault(require("../../../models/section"));
const authentication_1 = require("../../../tools/authentication");
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
//route for get departementfile list
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get departements list
            let departments = yield department_1.default.find({}).exec();
            //query for get all section from DB
            let sections = yield section_1.default.find({}).exec();
            //query for get all camera from DB
            let cameras = yield camera_1.default.find({}).exec();
            //return response not found to client if not found departements
            if (!departments) {
                req.flash("error", "Departement not found");
                return next(new error_handler_1.ApiError(404, "Departement not found"));
            }
            let response = [];
            //loop for get sort departments and section in json response
            for (let i = 0; i < departments.length; i++) {
                let childrenSection = [];
                for (let j = 0; j < sections.length; j++) {
                    if (sections[j].department_id.toString() ==
                        departments[i]._id.toString()) {
                        let childrenCamera = [];
                        for (let k = 0; k < cameras.length; k++) {
                            if (cameras[k].section_id.toString() == sections[j]._id.toString()) {
                                childrenCamera.push({
                                    _id: cameras[k]._id,
                                    name: cameras[k].name,
                                    type: "camera",
                                    url: cameras[k].url,
                                    username: cameras[k].username,
                                    password: cameras[k].password,
                                    ip: cameras[k].ip,
                                    is_enabled: cameras[k].is_enabled,
                                });
                            }
                        }
                        childrenSection.push({
                            _id: sections[j]._id,
                            name: sections[j].name,
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
                    _id: departments[i]._id,
                    name: departments[i].name,
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
                // page: page,
                // perPage: perPage,
                total: yield department_1.default.countDocuments().exec(),
                // pages: Math.ceil((await Departement.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
