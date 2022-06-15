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
exports.deleteImageInRedis = exports.getImageFromRedis = exports.setFileInRedis = exports.fileName = exports.location = void 0;
const util_1 = __importDefault(require("util"));
const multer_1 = __importDefault(require("multer"));
const createGuid_1 = __importDefault(require("../tools/createGuid"));
const redis_1 = __importDefault(require("./../db/redis"));
//define limits for file size
const maxSize = 10 * 1024 * 1024;
//define file type
let storage = multer_1.default.diskStorage({
    //define destination for file
    destination: (req, file, cb) => {
        cb(null, __dirname + "/../../assets/uploads/");
        exports.location = __dirname + "/../../assets/uploads/";
    },
    //define file name
    filename: (req, file, cb) => {
        exports.fileName = `${createGuid_1.default.newGuid()}.jpg`;
        cb(null, exports.fileName);
    },
});
//save file
let uploadFile = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: maxSize },
}).single("file");
//add upload file to promise for convert to nonBlocking
let uploadFileMiddleware = util_1.default.promisify(uploadFile);
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
                timestamp: new Date()
            };
            //insert to redis
            yield redis_1.default.set(fileInRedis.id, JSON.stringify(fileInRedis));
            //close redis connection
            redis_1.default.disconnect();
            //return file id
            return fileInRedis.id.toString();
        }
        catch (error) {
            console.log(error);
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
            const result = yield redis_1.default.get(id);
            const replaced = result === null || result === void 0 ? void 0 : result.replaceAll("'", '"');
            let fileInRedis = JSON.parse(replaced);
            redis_1.default.disconnect();
            //return file
            return fileInRedis;
        }
        catch (error) {
            console.log(error);
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
            console.log(error);
            throw new Error(error);
        }
    });
}
exports.deleteImageInRedis = deleteImageInRedis;
exports.default = uploadFileMiddleware;
