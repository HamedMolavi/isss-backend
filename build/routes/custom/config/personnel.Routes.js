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
const HttpException_1 = __importDefault(require("./../../../error/HttpException"));
const personnel_1 = __importDefault(require("./../../../models/personnel"));
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
//add route for register new personnel
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { first_name, last_name, national_code, email, phone_number, job_id, personnel_code, section_id, camera_whitelist, is_active, is_employee, is_dismissed } = req.body;
            //verify body request
            if (!first_name || !last_name || !national_code || !email || !phone_number || !job_id || !personnel_code ||
                !section_id || !camera_whitelist || !is_active || !is_employee || !is_dismissed) {
                req.flash("error", "Please fill all fields");
                return next(new HttpException_1.default(400, "Please fill all fields", "Personnel"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
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
                return next(new HttpException_1.default(400, "Personnel already exists", "Personnel"));
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
            yield personnel.save();
            req.flash("info", "Personnel has been registered");
            //send response
            res.status(201).json({
                message: "Success",
                personnel: personnel
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "Personnel"));
        }
    });
});
//route for get personnels list  
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
            //query for get user by personnels from DB
            let personnels = [];
            if (!(search && search.length > 0)) {
                personnels = yield personnel_1.default.find({
                    name: { $regex: search, $options: "i" }
                }).limit(perPage).skip(perPage * (page - 1)).exec();
            }
            else {
                personnels = yield personnel_1.default.find().limit(perPage).skip(perPage * (page - 1)).exec();
            }
            //send not found if personnels not found
            if (!personnels) {
                req.flash("error", "Personnels not found");
                return next(new HttpException_1.default(404, "Personnels not found", "Personnel"));
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
            return next(new HttpException_1.default(500, err.message, "Personnel"));
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
                return next(new HttpException_1.default(400, "Please enter id", "Personnel"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findById(id).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next(new HttpException_1.default(404, "Personnel not found", "Personnel"));
            }
            //send response
            return res.status(200).json({
                message: 'Success',
                personnel: personnel
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "Personnel"));
        }
    });
});
//add route for edit personnel
router.patch("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter id");
                return next(new HttpException_1.default(400, "Please enter id", "Personnel"));
            }
            const personnelBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findByIdAndUpdate(id, personnelBody, { new: true }).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next(new HttpException_1.default(404, "Personnel not found", "Personnel"));
            }
            //send response
            return res.status(201).json({
                message: 'Success',
                personnel: personnel
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "Personnel"));
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
                return next(new HttpException_1.default(400, "Please enter id", "Personnel"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findByIdAndDelete(id).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next(new HttpException_1.default(404, "Personnel not found", "Personnel"));
            }
            //send response
            return res.status(201).json({
                message: 'Success',
                personnel: personnel
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "Personnel"));
        }
    });
});
exports.default = router;
