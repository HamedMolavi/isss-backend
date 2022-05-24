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
const section_1 = __importDefault(require("./../../models/section"));
const authentication_1 = require("./../../tools/authentication");
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
            const { name, department } = req.body;
            //verify body request
            if (!name || !department) {
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
            let newSection = new section_1.default();
            //query for save new section in DB
            section_1.default.findOne({ name: name }, function (err, section) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (section) {
                        req.flash("error", "section already exists");
                        return res.status(201).json({ message: "section already exists" });
                    }
                    //fill new section
                    newSection = new section_1.default({
                        name: name,
                        departement: department !== null && department !== void 0 ? department : null
                    });
                    //save new section in DB
                    yield newSection.save(next);
                    //send response to client with new section 
                    return res.status(201).json({
                        message: 'section created',
                        section: newSection
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the section: ${err}` });
        }
    });
});
//route for get sections list  
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
            //query for get sections from DB
            section_1.default.find({}, function (err, sections) {
                if (err) {
                    return next(err);
                }
                if (!sections) {
                    return next(new Error("Not Found"));
                }
                //send response to client with sections    
                return res.status(200).json({
                    message: 'Success',
                    sections: sections
                });
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
            //query for get section by id from DB
            section_1.default.findById(id, function (err, section) {
                if (err) {
                    return next(err);
                }
                if (!section) {
                    return next(new Error("Not Found"));
                }
                //send response to client with section    
                return res.status(200).json({
                    message: 'Success',
                    section: section
                });
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
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            const sectionBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get section by id from DB
            section_1.default.findByIdAndUpdate(id, { $set: sectionBody }, function (err, section) {
                if (err) {
                    return next(err);
                }
                if (!section) {
                    return next(new Error("Not Found"));
                }
                section_1.default.findById(id, function (err, updateSection) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (err) {
                            return next(err);
                        }
                        //send response to client with section
                        return res.status(201).json({
                            message: 'Success',
                            section: updateSection
                        });
                    });
                });
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
            //query for get section by id from DB
            section_1.default.findByIdAndDelete(id, function (err, section) {
                if (err) {
                    return next(err);
                }
                if (!section) {
                    return next(new Error("Not Found"));
                }
                //send response to client with message
                return res.status(201).json({
                    message: 'Success',
                    section: section
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the section: ${err}` });
        }
    });
});
exports.default = router;
