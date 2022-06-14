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
const personnel_1 = __importDefault(require("../../models/personnel"));
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
//add route for register new personnel
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { first_name, last_name, national_code, email, phone_number, job_id, personnel_code, section_id, camera_whitelist, is_active, is_employee, is_dismissed } = req.body;
            //verify body request
            if (!first_name || !last_name || !national_code || !email || !phone_number || !job_id || !personnel_code ||
                !section_id || !camera_whitelist || !is_active || !is_employee || !is_dismissed) {
                req.flash("error", "Please fill all fields");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token has expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for save new personnel in DB
            let personnel = yield personnel_1.default.findOne({
                $or: [
                    { national_code: personnel_code },
                    { personnel_code: personnel_code }
                ]
            }).exec();
            //check personnel in DB
            if (personnel) {
                req.flash("error", "Personnel already exists");
                return next({ status: 200, message: "Personnel already exists" });
            }
            //create new personnel
            personnel = new personnel_1.default({
                first_name,
                last_name,
                national_code,
                email,
                phone_number,
                job_id,
                personnel_code,
                section_id,
                camera_whitelist,
                is_active,
                is_employee,
                is_dismissed
            });
            //save personnel in DB
            personnel = yield personnel.save();
            req.flash("info", "Personnel has been registered");
            //send response
            res.status(201).json({
                message: "Success",
                personnel: personnel
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the personnel: ${err}` });
        }
    });
});
//route for get personnel with search from DB 
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
            //query for search personnel by id from DB
            let personnel = yield personnel_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found personnel
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next(new Error("Not Found"));
            }
            //return response to client with perssonel
            return res.status(200).json({
                message: "Success",
                personnel: personnel,
                limit: limit,
                total: yield personnel_1.default.countDocuments().exec()
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the personnel: ${err}` });
        }
    });
});
//route for get personnels list  
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
            else if (critential.role !== "admin") {
                req.flash("error", "You are not admin");
                return next({ status: 401, message: "Unauthorized" });
            }
            //query for get user by personnels from DB
            let personnels = yield personnel_1.default.find().limit(perPage).skip(perPage * (page - 1)).exec();
            //send not found if personnels not found
            if (!personnels) {
                req.flash("error", "Personnels not found");
                return next({ status: 200, message: "Not Found" });
            }
            //send response
            return res.status(200).json({
                message: 'Success',
                personnels: personnels,
                page: page,
                perPage: perPage,
                total: yield personnel_1.default.countDocuments().exec(),
                pages: Math.ceil((yield personnel_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the personnel: ${err}` });
        }
    });
});
//route for get personnel by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
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
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findById(id).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next({ status: 200, message: "Not Found" });
            }
            //send response
            return res.status(200).json({
                message: 'Success',
                personnel: personnel
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the personnel: ${err}` });
        }
    });
});
//add route for edit personnel
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter id");
                return next({ status: 400, message: "Bad request" });
            }
            const personnelBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findByIdAndUpdate(id, personnelBody, { new: true }).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next({ status: 200, message: "Not Found" });
            }
            //send response
            return res.status(201).json({
                message: 'Success',
                personnel: personnel
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the personnel: ${err}` });
        }
    });
});
//add route for delete personnel
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
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findByIdAndDelete(id).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next({ status: 200, message: "Not Found" });
            }
            //send response
            return res.status(201).json({
                message: 'Success',
                personnel: personnel
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the personnel: ${err}` });
        }
    });
});
exports.default = router;
