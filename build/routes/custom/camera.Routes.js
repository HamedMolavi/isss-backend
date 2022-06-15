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
const camera_1 = __importDefault(require("../../models/camera"));
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
            const { network, departement_id, section_id, url, ip, name, username, password, is_enabled } = req.body;
            //verify body request
            if (!network || !departement_id || !section_id || !url || !ip || !name || !username || !password || !is_enabled) {
                req.flash("error", "Veuillez remplir tous les champs");
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
            //query for save new Camera in DB
            let camera = yield camera_1.default.findOne({
                $or: [
                    { ip: ip },
                    { name: name },
                    { url: url },
                ]
            }).exec();
            //return error if camera already exist
            if (camera) {
                req.flash("error", "camera already exist");
                return next({ status: 400, message: "Camera already exist" });
            }
            //fil new camera
            camera = new camera_1.default({
                network: network,
                departement_id: departement_id,
                section_id: section_id,
                url: url,
                ip: ip,
                name: name,
                username: username,
                password: password,
                is_enabled: is_enabled,
            });
            //save camera in DB
            yield camera.save();
            //return success
            req.flash("info", "camera added");
            return res.status(201).json({
                message: 'Success',
                camera: camera
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not the camera: ${err}` });
        }
    });
});
//route for get camera with search from DB 
router.get("/find", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get param from url
            let search = req.query.search;
            let strLimit = req.query.limit;
            let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
            if (!search) {
                req.flash("error", "Search is required");
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
            //query for search camera by id from DB
            let camera = yield camera_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found camera
            if (!camera) {
                req.flash("error", "Camera not found");
                return next({ status: 404, message: "Camera not found" });
            }
            //return response to client with camera
            return res.status(200).json({
                message: "Success",
                camera: camera,
                limit: limit,
                total: yield camera_1.default.countDocuments().exec(),
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the camera: ${err}` });
        }
    });
});
//route for get cameras list  
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
            //query for get cameras list
            let cameras = yield camera_1.default.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
            //return response not found to client if not found cameras
            if (!cameras) {
                req.flash("error", "Cameras not found");
                return next({ status: 404, message: "Cameras not found" });
            }
            //return response to client with departements list
            return res.status(200).json({
                message: "Success",
                cameras: cameras,
                page: page,
                perPage: perPage,
                total: yield camera_1.default.countDocuments().exec(),
                pages: Math.ceil((yield camera_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the departements: ${err}` });
        }
    });
});
//route for get camera by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from params in url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "id not found");
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
            //query for get camera by id from DB
            let camera = yield camera_1.default.findById(id).exec();
            //return error if camera not found
            if (!camera) {
                req.flash("error", "camera not found");
                return next({ status: 404, message: "Camera not found" });
            }
            //send response to client with camera
            return res.status(200).json({
                message: 'Success',
                camera: camera
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
            if (!id) {
                req.flash("error", "id not found");
                return next({ status: 400, message: "Bad request" });
            }
            //get jason from body request
            const cameraBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get user by id from DB
            let camera = yield camera_1.default.findByIdAndUpdate(id, cameraBody, { new: true }).exec();
            //return error if user not found
            if (!camera) {
                req.flash("error", "camera not found");
                return next({ status: 404, message: "Camera not found" });
            }
            //send response to client with user
            return res.status(201).json({
                message: 'Success',
                camera: camera
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
            //get id from url
            let id = req.params.id;
            if (!id) {
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
            //query for get camera by username from DB
            let camera = yield camera_1.default.findByIdAndDelete(id).exec();
            //return error if camera not found
            if (!camera) {
                req.flash("error", "camera not found");
                return next({ status: 404, message: "Camera not found" });
            }
            //send response to client with camera
            return res.status(201).json({
                message: 'Success',
                camera: camera
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the camera: ${err}` });
        }
    });
});
exports.default = router;
