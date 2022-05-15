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
const fileUpload_1 = __importStar(require("../tools/fileUpload"));
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const authentication_1 = require("../tools/authentication");
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
router.post('/file/upload', function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        //  try {
        //get token from header request
        let token = (0, authentication_1.getToken)(req, next);
        //verify token
        let critential = (0, authentication_1.authorize)(token);
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
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
        //  } catch (err) {
        //    return next({ status: 500, message: `Could not upload the file: ${req.file!.originalname}. ${err}` });
        //  }
    });
});
//create api for download image
router.get('/file/download/:fileName', function (req, res, next) {
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
            //get file name from request params
            const fileName = req.params.fileName;
            //get directory path
            const directoryPath = __dirname + "/../../assets/uploads/";
            //send image to client
            res.download(directoryPath + fileName, fileName, (err) => {
                if (err) {
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
router.get('/file/list', function (req, res, next) {
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
            //get directory path
            const directoryPath = __dirname + "/../../assets/uploads/";
            //get url 
            const baseUrl = process.env["BaseUrl"];
            //read directory for get list file
            fs_1.default.readdir(directoryPath, function (err, files) {
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
exports.default = router;
