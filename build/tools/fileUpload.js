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
exports.deleteDirectory = exports.deleteFiles = exports.readFiles = exports.deleteImageInRedis = exports.getImageFromRedis = exports.setFileInRedis = exports.uploadAvatar = exports.fileName = exports.location = void 0;
const redis_1 = __importDefault(require("./../db/redis"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const console_1 = __importDefault(require("console"));
function uploadAvatar(image_str, personnel_code) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //move file to buffer
            let image = Buffer.from(image_str, "base64");
            //get path for save file
            let _path = path_1.default.join(__dirname, "./../..");
            var dir = _path + "/assets/image";
            var dirPersonnelAvatar = _path + "/assets/image/" + personnel_code;
            //if path not exist, create path
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir);
            }
            //define path for save image
            if (!fs_1.default.existsSync(dirPersonnelAvatar)) {
                fs_1.default.mkdirSync(dirPersonnelAvatar);
            }
            //write image in path
            yield fs_1.default.writeFile(dirPersonnelAvatar + "/avatar.jpeg", image, (err) => {
                if (err) {
                    return null;
                }
            });
            const result = {
                name: "avatar.jpeg",
                path: dirPersonnelAvatar + personnel_code + ".jpeg",
            };
            return result;
        }
        catch (e) {
            return null;
        }
    });
}
exports.uploadAvatar = uploadAvatar;
//set file in redis
function setFileInRedis(fileBase64, id, Personnel_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //connet to redis if not connected
            if (!redis_1.default.isOpen) {
                yield redis_1.default.connect();
            }
            //define object for save in redis
            let fileInRedis = {
                id: id,
                personnel_id: Personnel_id,
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
function deleteImageInRedis(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //connet to redis if not connected
            if (!redis_1.default.isOpen) {
                yield redis_1.default.connect();
            }
            //delete file from redis
            let result = yield redis_1.default.del(id);
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
//function for read all image in assets and convert to base64 and return list base64
function readFiles(dirname) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        //check for exist path
        if (!fs_1.default.existsSync(dirname)) {
            return null;
        }
        //read all file in dirname
        let filenames = yield fs_1.default.promises.readdir(dirname);
        let response = [];
        //read file and convert to base 64 and return list base64
        for (let i = 0; i < filenames.length; i++) {
            //read file and convert to base64
            let hash_id = ((_a = filenames[i]) === null || _a === void 0 ? void 0 : _a.split("-")[1]).split(".")[0];
            let content = yield fs_1.default.promises.readFile(dirname + filenames[i], "base64");
            let result = {
                hash_id: hash_id,
                faces_base64: content,
            };
            response.push(result); //add to list
        }
        return response;
    });
}
exports.readFiles = readFiles;
//function for delete image in assets
function deleteFiles(fileName, dirname) {
    return __awaiter(this, void 0, void 0, function* () {
        //check for exist path
        if (!fs_1.default.existsSync(dirname)) {
            return null;
        }
        let result = false;
        //read all file in dirname
        let filenames = yield fs_1.default.promises.readdir(dirname);
        //delete file if exist
        for (let i = 0; i < filenames.length; i++) {
            if (fileName == filenames[i]) {
                yield fs_1.default.promises.unlink(dirname + filenames[i]); //delete file if exist
                result = true;
            }
        }
        yield deleteDirectory(dirname, false);
        return result;
    });
}
exports.deleteFiles = deleteFiles;
function deleteDirectory(dirname, force) {
    return __awaiter(this, void 0, void 0, function* () {
        //check for exist path
        if (!fs_1.default.existsSync(dirname)) {
            return null;
        }
        let result = false;
        let filenames = yield fs_1.default.promises.readdir(dirname);
        if (filenames.length > 0 && !force) {
            return false;
        }
        yield fs_1.default.promises.rm(dirname, { recursive: true, force: true }); //delete file if exist
        result = true;
        return result;
    });
}
exports.deleteDirectory = deleteDirectory;
