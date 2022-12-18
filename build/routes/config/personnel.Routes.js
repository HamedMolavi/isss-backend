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
const path_1 = __importDefault(require("path"));
const connectElasticSearch_1 = require("../../db/connectElasticSearch");
const error_handler_1 = require("../../error/error.handler");
const camera_1 = __importDefault(require("../../models/camera"));
const personImage_1 = __importDefault(require("../../models/personImage"));
const fileUpload_1 = require("../../tools/fileUpload");
const personnel_1 = __importDefault(require("./../../models/personnel"));
const authentication_1 = require("./../../tools/authentication");
//get user role from enviroment variable
const const_role = process.env.const_role || "user";
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
            const { first_name, last_name, national_code, email, phone_number, job_id, personnel_code, section_id, camera_whitelist, is_active, is_employee, is_dismissed, avatar_str } = req.body;
            //verify body request
            if (!first_name || !last_name || !national_code || !email || !phone_number || !job_id || !personnel_code || !section_id || !camera_whitelist) {
                req.flash("error", "Please fill all fields");
                return next(new error_handler_1.ApiError(400, "Please fill all fields"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for save new personnel in DB
            let personnel = yield personnel_1.default.findOne({
                $or: [{ national_code: national_code }, { personnel_code: personnel_code }],
            }).exec();
            //check personnel in DB
            if (personnel) {
                req.flash("error", "Personnel already exists");
                return next(new error_handler_1.ApiError(400, "Personnel already exists"));
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
                is_dismissed,
            });
            //save personnel in DB
            let _personnnel = yield personnel.save();
            req.flash("info", "Personnel has been registered");
            //save personnel avatar in hardDisk
            let avatarStr = avatar_str.split(",")[1];
            let result = yield (0, fileUpload_1.uploadAvatar)(avatarStr, _personnnel._id.toString());
            //send response
            res.status(201).json({
                success: true,
                data: _personnnel.toJSON(),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
//route for get personnels list
router.get("", function (req, res, next) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
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
            if (!token) {
                return null;
            }
            //query for get user by personnels from DB
            let personnels = [];
            if (!(search && search.length > 0)) {
                personnels = yield personnel_1.default.find({
                    name: { $regex: search, $options: "i" },
                })
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            else {
                personnels = yield personnel_1.default.find()
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            //send not found if personnels not found
            if (!personnels) {
                req.flash("error", "Personnels not found");
                return next(new error_handler_1.ApiError(404, "Personnels not found"));
            }
            let data = [];
            for (let _personnel of personnels) {
                // data =personnels.map(async(person) => {
                let per = _personnel.toJSON();
                let logPersonnel = yield (0, connectElasticSearch_1.requestForGetPersonnel)(_personnel._id.toString());
                let _camera;
                if (((_c = (_b = (_a = logPersonnel === null || logPersonnel === void 0 ? void 0 : logPersonnel.data) === null || _a === void 0 ? void 0 : _a.hits) === null || _b === void 0 ? void 0 : _b.hits) === null || _c === void 0 ? void 0 : _c.length) > 0) {
                    _camera = yield camera_1.default.findById((_e = (_d = logPersonnel.data.hits.hits[0]) === null || _d === void 0 ? void 0 : _d._source) === null || _e === void 0 ? void 0 : _e.camera_id).populate("section_id").exec();
                }
                // else {
                //   data.push(per);
                //   continue;
                // }
                (per.lastCameraSeen = _camera ? _camera.name : ""), (per.lastSection = _camera ? _camera.section_id : "");
                per.lastTimeSeen = new Date((_j = (_h = (_g = (_f = logPersonnel.data) === null || _f === void 0 ? void 0 : _f.hits) === null || _g === void 0 ? void 0 : _g.hits[0]) === null || _h === void 0 ? void 0 : _h._source) === null || _j === void 0 ? void 0 : _j.timestamp);
                // per.lastTimeSeen = randomDate('02/13/2020', '01/01/2022');
                data.push(per);
            }
            //send response
            return res.status(200).json({
                success: true,
                data: data,
                page: page,
                perPage: perPage,
                total: yield personnel_1.default.countDocuments().exec(),
                pages: Math.ceil((yield personnel_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
// function randomDate(date1: any, date2: any) {
//   function randomValueBetween(min: any, max: any) {
//     return Math.random() * (max - min) + min;
//   }
//   var date1 = date1 || "01-01-1970";
//   var date2 = date2 || new Date().toLocaleDateString();
//   date1 = new Date(date1).getTime();
//   date2 = new Date(date2).getTime();
//   if (date1 > date2) {
//     return new Date(randomValueBetween(date2, date1)).toLocaleDateString();
//   } else {
//     return new Date(randomValueBetween(date1, date2)).toLocaleDateString();
//   }
// }
// function randomDate(start, end, startHour, endHour) {
//   var date = new Date(+start + Math.random() * (end - start));
//   var hour = startHour + Math.random() * (endHour - startHour) | 0;
//   date.setHours(hour);
//   return date;
// }
//route for get personnel by id from DB
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //return error if id not found
            if (!id) {
                req.flash("error", "Please enter id");
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findById(id).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next(new error_handler_1.ApiError(404, "Personnel not found"));
            }
            //send response
            return res.status(200).json({
                success: true,
                data: personnel.toJSON(),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
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
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            const personnelBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findByIdAndUpdate(id, personnelBody, {
                new: true,
            }).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next(new error_handler_1.ApiError(404, "Personnel not found"));
            }
            if (personnelBody.avatar_str) {
                //save personnel avatar in hardDisk
                let avatarStr = personnelBody.avatar_str.split(",")[1];
                let result = yield (0, fileUpload_1.uploadAvatar)(avatarStr, personnel._id.toString());
            }
            //send response
            return res.status(201).json({
                success: true,
                data: personnel.toJSON(),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
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
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get personnel by id from DB
            let personnel = yield personnel_1.default.findByIdAndDelete(id).exec();
            //send not found if personnel not found
            if (!personnel) {
                req.flash("error", "Personnel not found");
                return next(new error_handler_1.ApiError(404, "Personnel not found"));
            }
            //delete image vector
            let personImages = yield personImage_1.default.deleteMany({ person_id: personnel._id }).exec();
            //define path folder fo read files
            let pathDelete = path_1.default.join(__dirname, `./../../../assets/image/${id}`);
            //delete face image directory
            (0, fileUpload_1.deleteDirectory)(pathDelete, true);
            //send response
            return res.status(201).json({
                success: true,
                // data: personnel.toJSON(),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "Internal server error , " + err.message));
        }
    });
});
exports.default = router;
