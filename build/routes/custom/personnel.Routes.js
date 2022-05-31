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
            const { name, family, phone, jobTitle } = req.body;
            //verify body request
            if (!name || !family || !phone || !jobTitle) {
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            let newPersonnel = new personnel_1.default();
            //query for save new personnel in DB
            personnel_1.default.findOne({ name: name }, function (err, personnel) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (personnel) {
                        req.flash("error", "personnel already exists");
                        return res.status(201).json({ message: "personnel already exists" });
                    }
                    //fill new personnel
                    newPersonnel = new personnel_1.default({
                        name: name,
                        family: family,
                        phone: phone,
                        jobTitle: jobTitle !== null && jobTitle !== void 0 ? jobTitle : null
                    });
                    //save new personnel in DB
                    yield newPersonnel.save(next);
                    //send response to client with new personnel 
                    return res.status(201).json({
                        message: 'personnel created',
                        personnel: newPersonnel
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the personnel: ${err}` });
        }
    });
});
//route for get personnels list  
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get personnels from DB
            personnel_1.default.find({}, function (err, personnels) {
                if (err) {
                    return next(err);
                }
                if (!personnels) {
                    return next(new Error("Not Found"));
                }
                //send response to client with personnels    
                return res.status(200).json({
                    message: 'Success',
                    personnels: personnels
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the personnels: ${err}` });
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
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get personnel by id from DB
            personnel_1.default.findById(id, function (err, personnel) {
                if (err) {
                    return next(err);
                }
                if (!personnel) {
                    return next(new Error("Not Found"));
                }
                //send response to client with personnel    
                return res.status(200).json({
                    message: 'Success',
                    personnel: personnel
                });
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
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            const personnelBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get personnel by id from DB
            personnel_1.default.findByIdAndUpdate(id, { $set: personnelBody }, function (err, personnel) {
                if (err) {
                    return next(err);
                }
                if (!personnel) {
                    return next(new Error("Not Found"));
                }
                personnel_1.default.findById(id, function (err, updatePersonnel) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (err) {
                            return next(err);
                        }
                        //send response to client with personnel
                        return res.status(201).json({
                            message: 'Success',
                            personnel: updatePersonnel
                        });
                    });
                });
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
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get personnel by id from DB
            personnel_1.default.findByIdAndDelete(id, function (err, personnel) {
                if (err) {
                    return next(err);
                }
                if (!personnel) {
                    return next(new Error("Not Found"));
                }
                //send response to client with personnel
                return res.status(201).json({
                    message: 'Success',
                    personnel: personnel
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the personnel: ${err}` });
        }
    });
});
exports.default = router;
