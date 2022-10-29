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
const fileUpload_1 = require("./../../tools/fileUpload");
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const authentication_1 = require("./../../tools/authentication");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const personImage_1 = __importDefault(require("./../../models/personImage"));
const hash_1 = require("./../../tools/hash");
const error_handler_1 = require("../../error/error.handler");
//create router for add to server
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
const const_role = process.env.const_role || "user";
//create api for upload image
router.post("/upload", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get personnel_code from url
            const { perssonel_id, image_str } = req.body;
            if (!perssonel_id || !image_str) {
                req.flash("error", "Please enter a personnel_code");
                return next(new error_handler_1.ApiError(400, "Please enter a personnel_code"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //get file from request and change format  to json and get file name and save in server with personnel_code
            let result = yield (0, fileUpload_1.uploadAvatar)(image_str, perssonel_id);
            if (!result) {
                return null;
            }
            //send response to client
            res.status(201).send({
                success: true,
                data: {
                    name: result.name,
                    location: result.path,
                    message: "Uploaded the file successfully: " + result,
                },
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//create api for download image
router.get("/download/:fileName", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //get file name from request params
            const fileName = req.params.fileName;
            //get directory path
            const directoryPath = path_1.default.join(__dirname, "./../../../assets/image/") + fileName + "/";
            //send image to client
            yield res.download(directoryPath + "avatar.jpeg", fileName, (err) => {
                if (err) {
                    req.flash("error", "File not found");
                    return next(new error_handler_1.ApiError(404, "File not found"));
                }
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//create api for get list file upload
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            let fileInfos = [];
            //get directory path
            const directoryPath = path_1.default.join(__dirname, "./../../../assets/image/");
            //get list directory images in directory path
            let imageFolders = yield fs_1.default.promises.readdir(directoryPath);
            //loop through list directory images and get file info in each directory
            for (let i = 0; i < imageFolders.length; i++) {
                //get file info in each directory
                let imageFiles = yield fs_1.default.promises.readdir(directoryPath + "/" + imageFolders[i]);
                //loop through list file in each directory and get file info
                for (let j = 0; j < imageFiles.length; j++) {
                    //get file info
                    let fileInfo = yield fs_1.default.promises.stat(directoryPath + "/" + imageFolders[i] + "/" + imageFiles[j]);
                    //push file info to array
                    fileInfos.push({
                        name: imageFiles[j],
                        size: fileInfo.size,
                        path: directoryPath + imageFolders[i] + "/" + imageFiles[j],
                    });
                }
            }
            //send response to client
            res.status(200).send(fileInfos);
            // const baseUrl = process.env["BaseUrl"] as string;
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//api for upload image to redis
router.post("/redis", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // get id from request url
            const { personnel_id, image_str } = req.body;
            const image_str_base46 = String(image_str.split(",")[1]);
            //  const personnel_id = req.params.id;
            // //get token from header request and verify
            // let token = getTokenAndVerify(req, const_role, next);
            // if (!token) {
            //   return null;
            // }
            // // // //get file from request and change format  to json
            // let reqFile = JSON.parse(JSON.stringify(req.files));
            // // // //move file to buffer
            // let image = Buffer.from(reqFile.file.data, "base64");
            // // // //convert file to base64
            // let fileBase64 = image.toString("base64");
            // //  let fileName: string =  "test.jpg";
            //create hash for redis id
            let idHashed = (0, hash_1.hashJson)(image_str_base46, personnel_id);
            //set file in redis
            let id = yield (0, fileUpload_1.setFileInRedis)(image_str_base46, idHashed, personnel_id);
            if (!id) {
                req.flash("error", "File not upload");
                return next(new error_handler_1.ApiError(400, "File not upload"));
            }
            //get url AI for send request
            const dbUri = process.env["API_AI_REDIS_NAME"];
            //send request to AI api for send id_personnel
            var data = JSON.stringify({
                id: idHashed,
            });
            var config = {
                method: "post",
                url: dbUri + "/redis/face",
                headers: {
                    "Content-Type": "application/json",
                },
                data: data,
            };
            (0, axios_1.default)(config)
                .then(function (response) {
                console.log(JSON.stringify(response.data));
            })
                .catch(function (error) {
                console.log(error);
            });
            res.status(201).send({
                success: true,
                data: {
                    message: "Uploaded the file successfully",
                    id: idHashed,
                },
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for verified image in redis
router.post("/verify", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get body from request
            const requestBody = req.body;
            if (!requestBody.id) {
                req.flash("error", "id is required!");
                return next({ status: 400, message: "id is required" });
            }
            //get jason information from redis
            let redisData = yield (0, fileUpload_1.getImageFromRedis)(requestBody.id);
            //convert base64 to file
            let image = Buffer.from(redisData.face, "base64");
            // let embedding = Buffer.from(redisData.embedding, "base64");
            //covert base64 to array buffer
            //let embeddingArray: Number[] = Buffer.from(redisData.embedding, "base64").toJSON().data;
            // let embeddingArray =  Uint8Array.from(atob(redisData.embedding), c => c.charCodeAt(0))
            // function bytesToFloatArray(bytes: any) {
            //   var output = bytes.buffer; // Get the ArrayBuffer from the Uint8Array.
            //   return new Float32Array(output); // Convert the ArrayBuffer to floats.
            // }
            // let embeddingArray = bytesToFloatArray(embedding);
            //Face recognition condition
            if (redisData.has_face === 1) {
                let guid = requestBody.id;
                //create name for image
                let fileName = guid + ".jpeg";
                //todo : convert BGR to RGB
                //define path for save image
                let pathSave = path_1.default.join(__dirname, `./../../../assets/image/${redisData.personnel_id}`);
                if (!fs_1.default.existsSync(pathSave)) {
                    fs_1.default.mkdirSync(pathSave);
                }
                pathSave = path_1.default.join(__dirname, `./../../../assets/image/${redisData.personnel_id}/${redisData.personnel_id}-`);
                //write image in path
                yield fs_1.default.writeFile(pathSave + fileName, image, (err) => {
                    if (err) {
                        return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
                    }
                });
                let embedding = redisData.embedding;
                //create new personimage
                // if (!personImage) {
                let personImage = new personImage_1.default();
                personImage.person_id = redisData.personnel_id;
                personImage.vector = embedding;
                personImage.hash_id = guid;
                //  save personimage in database
                yield personImage.save();
                // }
                //  delete jason image in redis
                let result = yield (0, fileUpload_1.deleteImageInRedis)(requestBody.id.toString());
                //   send response to client
                //get url AI for send request
                const dbUri = process.env["API_AI_REDIS_NAME"];
                //send request to AI api for send id_personnel
                var config = {
                    method: "get",
                    url: dbUri + "/embed",
                    headers: {
                        "Content-Type": "application/json",
                    },
                };
                let response = yield (0, axios_1.default)(config);
                return res.status(200).send({
                    success: true,
                    data: {
                        message: "Verified the file successfully",
                        face: redisData.face,
                        hash_id: guid,
                    },
                });
            }
            else if (Number(redisData.has_face) === 0) {
                req.flash("error", "No face found");
                //send response to client for not face recognition
                res.status(406).send({
                    message: "No face found",
                });
            }
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
exports.default = router;
