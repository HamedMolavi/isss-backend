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
const departement_1 = __importDefault(require("./../../models/departement"));
const authentication_1 = require("./../../tools/authentication");
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
            const { name } = req.body;
            //verify body request
            if (!name) {
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
            let newDepartement = new departement_1.default();
            //query for save new departement in DB
            departement_1.default.findOne({ name: name }, function (err, departement) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (departement) {
                        req.flash("error", "departement already exists");
                        return res.status(201).json({ message: "departement already exists" });
                    }
                    //fill new departement
                    newDepartement = new departement_1.default({
                        name: name
                    });
                    //save new departement in DB
                    yield newDepartement.save(next);
                    //send response to client with new departement 
                    return res.status(201).json({
                        message: 'departement created',
                        departement: newDepartement
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the departement: ${err}` });
        }
    });
});
//route for get departements list  
router.get("/departements", function (req, res, next) {
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
            //query for get departements from DB
            departement_1.default.find({}, function (err, departements) {
                if (err) {
                    return next(err);
                }
                if (!departements) {
                    return next(new Error("Not Found"));
                }
                //send response to client with departement    
                return res.status(200).json({
                    message: 'Success',
                    departements: departements
                });
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
            //query for get departement by id from DB
            departement_1.default.findById(req.params.id, function (err, departement) {
                if (err) {
                    return next(err);
                }
                if (!departement) {
                    return next(new Error("Not Found"));
                }
                //send response to client with departement    
                return res.status(200).json({
                    message: 'Success',
                    departement: departement
                });
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
                return next({ status: 400, message: "Bad request" });
            }
            const departementBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get camera by id from DB
            departement_1.default.findById(id, function (err, departement) {
                var _a;
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (!departement) {
                        return next(new Error("Not Found"));
                    }
                    //fill departement
                    departement.name = (_a = departementBody.name) !== null && _a !== void 0 ? _a : departement.name;
                    //save departement in DB
                    yield departement.save(next);
                    //send response to client with departement
                    return res.status(201).json({
                        message: 'Success',
                        departement: departement
                    });
                });
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
            //query for get departement by id from DB
            departement_1.default.findByIdAndDelete(id, function (err, departement) {
                if (err) {
                    return next(err);
                }
                if (!departement) {
                    return next(new Error("Not Found"));
                }
                //send response to client with departement
                return res.status(201).json({
                    message: 'Success',
                    departement: departement
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the departement: ${err}` });
        }
    });
});
exports.default = router;
