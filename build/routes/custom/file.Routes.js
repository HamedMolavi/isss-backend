"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const fileUpload_1 = __importStar(require("../../tools/fileUpload"));
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const authentication_1 = require("../../tools/authentication");
const axios_1 = __importDefault(require("axios"));
const createGuid_1 = __importDefault(require("../../tools/createGuid"));
const path_1 = __importDefault(require("path"));
const personImage_1 = __importDefault(require("./../../models/personImage"));
const multer_1 = __importDefault(require("multer"));
const hash_1 = require("../../tools/hash");
//create router for add to server 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//create api for upload image 
router.post('/upload', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token is expired");
                return next({ status: 401, message: "Token expired" });
            }
            //get file from request body and save 
            yield (0, fileUpload_1.default)(req, res);
            if (req.file == undefined) {
                return next({ status: 400, message: "Please upload a file!" });
            }
            res.status(200).send({
                name: fileUpload_1.fileName,
                location: fileUpload_1.location,
                message: "Uploaded the file successfully: " + fileUpload_1.fileName,
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not upload the file: ${req.file.originalname}. ${err}` });
        }
    });
});
//create api for download image
router.get('/download/:fileName', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //get file name from request params
            const fileName = req.params.fileName;
            //get directory path
            const directoryPath = __dirname + "./../../../assets/uploads/";
            //send image to client
            yield res.download(directoryPath + fileName, fileName, (err) => {
                if (err) {
                    req.flash("error", "File not found");
                    return next({ status: 500, message: `Could not download the file: ${fileName}. ${err}` });
                }
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not download the file: ${fileUpload_1.fileName}. ${err}` });
        }
    });
});
//create api for get list file upload
router.get('/list', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //get directory path
            const directoryPath = __dirname + "/../../../assets/uploads/";
            //get url 
            const baseUrl = process.env["BaseUrl"];
            //read directory for get list file
            yield fs_1.default.readdir(directoryPath, function (err, files) {
                if (err) {
                    return next({ status: 500, message: `Could not get list file. ${err}` });
                }
                let fileInfos = [];
                //get file info
                files.forEach((file) => {
                    fileInfos.push({
                        name: file,
                        url: baseUrl + '/download/' + file,
                    });
                });
                res.status(200).send(fileInfos);
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get list files: ${err}` });
        }
    });
});
//add package multer for upload file
var storage = multer_1.default.memoryStorage();
//create multer for upload file and save in memory
var upload = (0, multer_1.default)({ storage: storage });
//create api for upload image to redis
router.post('/redis', upload.single('file'), function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // get personnel_id from body request
            const { personnel_id } = req.body;
            // get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //get file from request body and save
            let fileBase64;
            let file = req.file.buffer;
            //convert file to base64
            fileBase64 = file.toString('base64');
            //create hash for redis id
            let idHashed = (0, hash_1.hashJson)(fileBase64, personnel_id);
            console.log(idHashed);
            //set file in redis
            let id = yield (0, fileUpload_1.setFileInRedis)(fileBase64, idHashed);
            if (!id) {
                req.flash("error", "File not upload");
                return next({ status: 400, message: "Please upload a file!" });
            }
            //get url AI for send request
            const dbUri = process.env["API_AI_REDIS_NAME"];
            //send request to AI api for send id_personnel
            yield axios_1.default.post(dbUri, {
                id: idHashed
            }).then(function (response) {
                console.log("Response From API AI :" + response.status);
                req.flash("info", "Uploaded the file successfully");
                //  send response to client
            }).catch(function (error) {
                console.log(error.response.data);
                return next({ status: 400, message: "There is a problem, please try again" });
            });
            res.status(201).send({
                message: "Uploaded the file successfully"
            });
            //send error if file is not upload
        }
        catch (err) {
            return next({ status: 500, message: `Could not upload the file. ${err}` });
        }
    });
});
//route for verified image in redis
router.post('/verify', function (req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get body from request
            const { id } = req.body;
            if (!id) {
                req.flash("error", "id is required!");
                return next({ status: 400, message: "id is required" });
            }
            //get jason information from redis
            let redisData = yield (0, fileUpload_1.getImageFromRedis)(id);
            //convert base64 to file
            let image = Buffer.from(redisData.face, 'base64');
            //covert base64 to array buffer
            let embeddingArray = Buffer.from(redisData.embedding, 'base64').toJSON().data;
            //Face recognition condition
            if (redisData.has_face === 1) {
                let guid = id + "-" + createGuid_1.default.newGuid();
                //create name for image
                let fileName = guid + ".jpg";
                //todo : convert BGR to RGB
                //define path for save image
                let pathSave = path_1.default.join(__dirname, './../../../assets/uploads/');
                //write image in path 
                yield fs_1.default.writeFile(pathSave + fileName, image, (err) => {
                    if (err) {
                        return next({ status: 500, message: `Could not save the file: ${fileName}. ${err}` });
                    }
                });
                //query to database for search personnel
                let personImage = yield personImage_1.default.findOne({ guid: fileName }).exec();
                //create new personimage  
                personImage = new personImage_1.default({
                    person_id: '6283724be1996b883080a495',
                    guid: guid,
                    vector: embeddingArray,
                });
                //  save personimage in database
                yield personImage.save();
                //  delete jason image in redis
                let result = yield (0, fileUpload_1.deleteImageInRedis)(id.toString());
                //   send response to client
                res.status(200).send({
                    message: "Verified the file successfully"
                });
            }
            else if (Number(redisData.has_face) === 0) {
                req.flash("error", "No face found");
                //send response to client for not face recognition
                res.status(406).send({
                    message: "No face found"
                });
            }
        }
        catch (err) {
            return next({ status: 500, message: `Could not upload the file: ${(_a = req.file) === null || _a === void 0 ? void 0 : _a.originalname}. ${err}` });
        }
    });
});
exports.default = router;
