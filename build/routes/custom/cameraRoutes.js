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
const camera_1 = __importDefault(require("./../../models/camera"));
const authentication_1 = require("../../tools/authentication");
//create router for add to server 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new camera
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { ip, name, username, password, rstpLink } = req.body;
            //verify body request
            if (!ip || !name || !username || !password || !rstpLink) {
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
            let newCamera = new camera_1.default();
            //query for save new Camera in DB
            camera_1.default.findOne({ name: name }, function (err, camera) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (camera) {
                        req.flash("error", "Camera already exists");
                        return res.status(201).json({ message: "Camera already exists" });
                    }
                    //fill new camera
                    newCamera = new camera_1.default({
                        ip: ip,
                        name: name,
                        username: username,
                        password: password,
                        rstpLink: rstpLink
                    });
                    // newUser.password = await User.setPassword(password);
                    //save new user in DB
                    yield newCamera.save(next);
                    //send response to client with new camera 
                    return res.status(201).json({
                        message: 'Success',
                        camera: newCamera
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the camera: ${err}` });
        }
    });
});
//route for get cameras list  
router.get("/cameras", function (req, res, next) {
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
            //query for get cameras from DB
            camera_1.default.find({}, function (err, cameras) {
                if (err) {
                    return next(err);
                }
                if (!cameras) {
                    return next(new Error("Not Found"));
                }
                //send response to client with camera    
                return res.status(200).json({
                    message: 'Success',
                    cameras: cameras
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the camera: ${err}` });
        }
    });
});
//route for get camera by id from DB 
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
            //query for get camera by id from DB
            camera_1.default.findById(req.params.id, function (err, camera) {
                if (err) {
                    return next(err);
                }
                if (!camera) {
                    return next(new Error("Not Found"));
                }
                //send response to client with camera    
                return res.status(200).json({
                    message: 'Success',
                    camera: camera
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the camera: ${err}` });
        }
    });
});
//add route for edit camera
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
            const cameraBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                return next({ status: 401, message: "Token expired" });
            }
            //query for get user by id from DB
            camera_1.default.findById(id, function (err, camera) {
                var _a, _b, _c, _d, _e;
                if (err) {
                    return next(err);
                }
                if (!camera) {
                    return next(new Error("Not Found"));
                }
                //fill camera
                camera.ip = (_a = cameraBody.ip) !== null && _a !== void 0 ? _a : camera.ip;
                camera.name = (_b = cameraBody.name) !== null && _b !== void 0 ? _b : camera.name;
                camera.username = (_c = cameraBody.username) !== null && _c !== void 0 ? _c : camera.username;
                camera.password = (_d = cameraBody.password) !== null && _d !== void 0 ? _d : camera.password;
                camera.rstpLink = (_e = cameraBody.rstpLink) !== null && _e !== void 0 ? _e : camera.rstpLink;
                //save camera in DB
                camera.save(next);
                //send response to client with camera
                return res.status(201).json({
                    message: 'Success',
                    camera: camera
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the camera: ${err}` });
        }
    });
});
//add route for delete camera
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
            //query for get camera by username from DB
            camera_1.default.findByIdAndDelete(id, function (err, camera) {
                if (err) {
                    return next(err);
                }
                if (!camera) {
                    return next(new Error("Not Found"));
                }
                //send response to client with camera
                return res.status(201).json({
                    message: 'Success',
                    camera: {}
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the user: ${err}` });
        }
    });
});
exports.default = router;
