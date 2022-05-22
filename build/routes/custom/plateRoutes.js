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
const plate_1 = __importDefault(require("../../models/plate"));
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
//add route for register new plate
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { number, carBrand, color, owner } = req.body;
            //verify body request
            if (!number || !carBrand || !color || !owner) {
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
            let newPlate = new plate_1.default();
            //query for save new plate in DB
            plate_1.default.findOne({ number: number }, function (err, plate) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (plate) {
                        req.flash("error", "plate already exists");
                        return res.status(201).json({ message: "plate already exists" });
                    }
                    //fill new plate
                    newPlate = new plate_1.default({
                        number: number,
                        carBrand: carBrand,
                        color: color,
                        owner: owner
                    });
                    //save new plate in DB
                    yield newPlate.save(next);
                    //send response to client with new plate 
                    return res.status(201).json({
                        message: 'plate created',
                        plate: newPlate
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the plate: ${err}` });
        }
    });
});
//route for get plate list  
router.get("/plates", function (req, res, next) {
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
            //query for get plate from DB
            plate_1.default.find({}, function (err, plates) {
                if (err) {
                    return next(err);
                }
                if (!plates) {
                    return next(new Error("Not Found"));
                }
                //send response to client with plates    
                return res.status(200).json({
                    message: 'Success',
                    plates: plates
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the plates: ${err}` });
        }
    });
});
//route for get plate by id from DB 
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
            //query for get plate by id from DB
            plate_1.default.findById(id, function (err, plate) {
                if (err) {
                    return next(err);
                }
                if (!plate) {
                    return next(new Error("Not Found"));
                }
                //send response to client with plate    
                return res.status(200).json({
                    message: 'Success',
                    plate: plate
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the plate: ${err}` });
        }
    });
});
//add route for edit plate
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            const plateBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get plate by id from DB
            plate_1.default.findById(id, function (err, plate) {
                var _a, _b, _c, _d;
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (!plate) {
                        return next({ status: 401, message: "Not Found" });
                    }
                    ;
                    //update plate model
                    let updatePlate = new plate_1.default({
                        id: id,
                        number: (_a = plateBody.number) !== null && _a !== void 0 ? _a : plate.number,
                        carBrand: (_b = plateBody.carBrand) !== null && _b !== void 0 ? _b : plate.carBrand,
                        color: (_c = plateBody.color) !== null && _c !== void 0 ? _c : plate.color,
                        owner: (_d = plateBody.owner) !== null && _d !== void 0 ? _d : plate.owner
                    });
                    //save edit plate in DB
                    yield updatePlate.set(next);
                    //return response with message and plate
                    return res.status(201).json({
                        message: 'plate Edited',
                        plate: updatePlate
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the plate: ${err}` });
        }
    });
});
//add route for delete plate
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
            //query for get plate by id from DB
            plate_1.default.findById(id, function (err, plate) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (!plate) {
                        return next(new Error("Not Found"));
                    }
                    //delete plate in DB
                    yield plate.delete(next);
                    //send response to client with plate
                    return res.status(201).json({
                        message: 'plate Deleted',
                        plate: {}
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the plate: ${err}` });
        }
    });
});
exports.default = router;
