"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileName = exports.location = void 0;
const util_1 = __importDefault(require("util"));
const multer_1 = __importDefault(require("multer"));
const createGuid_1 = __importDefault(require("../tools/createGuid"));
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
        console.log(file.originalname);
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
exports.default = uploadFileMiddleware;
