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
exports.deleteImageInRedis = exports.getImageFromRedis = exports.setFileInRedis = exports.uploadAvatar = exports.fileName = exports.location = void 0;
const redis_1 = __importDefault(require("./../db/redis"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const console_1 = __importDefault(require("console"));
const error_handler_1 = require("../error/error.handler");
function uploadAvatar(req, res, personnel_code, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get file from request and change format  to json
            let reqFile = JSON.parse(JSON.stringify(req.files));
            //check file is small than 10MB
            if (Number(reqFile.file.size) > 12419) {
                req.flash("error", "File size is too large");
                return next(new error_handler_1.ApiError(400, "File size is too large"));
            }
            //move file to buffer
            let image = Buffer.from(reqFile.file.data, "base64");
            //get path for save file
            let _path = path_1.default.join(__dirname, "./../..");
            var dir = _path + "/assets/image";
            //if path not exist, create path
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir);
            }
            var dirPersonnelAvatar = _path + "/assets/image/" + personnel_code;
            if (!fs_1.default.existsSync(dirPersonnelAvatar)) {
                fs_1.default.mkdirSync(dirPersonnelAvatar);
            }
            //write image in path
            //upload image to server
            yield fs_1.default.writeFile(dirPersonnelAvatar + "/avatar.png", image, (err) => {
                if (err) {
                    return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
                }
            });
            const result = {
                name: "avatar.png",
                path: dirPersonnelAvatar + personnel_code + ".png",
            };
            return result;
        }
        catch (e) {
            return next(new error_handler_1.ApiError(500, "internal server error" + e.message));
        }
    });
}
exports.uploadAvatar = uploadAvatar;
//set file in redis
function setFileInRedis(fileBase64, Personnel_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //connet to redis if not connected
            if (!redis_1.default.isOpen) {
                yield redis_1.default.connect();
            }
            //define object for save in redis
            let fileInRedis = {
                id: Personnel_id,
                full_frame: fileBase64,
                face: "",
                embedding: "",
                has_face: 0,
                timestamp: new Date(),
            };
            //insert to redis
            yield redis_1.default.set(fileInRedis.id, JSON.stringify(fileInRedis));
            //close redis connection
            redis_1.default.disconnect();
            //return file id
            return fileInRedis.id.toString();
        }
        catch (error) {
            console_1.default.log(error);
            throw new Error(error);
        }
    });
}
exports.setFileInRedis = setFileInRedis;
//get image verified from redis
function getImageFromRedis(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //connet to redis if not connected
            if (!redis_1.default.isOpen) {
                yield redis_1.default.connect();
            }
            const result = (yield redis_1.default.get(id));
            const replaced = result === null || result === void 0 ? void 0 : result.replaceAll("'", '"');
            let fileInRedis = JSON.parse(replaced);
            redis_1.default.disconnect();
            //return file
            return fileInRedis;
        }
        catch (error) {
            console_1.default.log(error);
            throw new Error(error);
        }
    });
}
exports.getImageFromRedis = getImageFromRedis;
//delete jason image in redis
function deleteImageInRedis(Personnel_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //connet to redis if not connected
            if (!redis_1.default.isOpen) {
                yield redis_1.default.connect();
            }
            //delete file from redis
            let result = yield redis_1.default.del(Personnel_id);
            //close redis connection
            redis_1.default.disconnect();
            //return file
            return result;
        }
        catch (error) {
            console_1.default.log(error);
            throw new Error(error);
        }
    });
}
exports.deleteImageInRedis = deleteImageInRedis;
