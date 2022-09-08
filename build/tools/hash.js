"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashJson = void 0;
const md5_1 = __importDefault(require("md5"));
//function for hash json for create id save picture in redis
function hashJson(data, personnel_id) {
    //define object for save in redis
    let fileInRedis = {
        Personnel_id: personnel_id,
        full_frame: data,
        face: "",
        embedding: "",
        has_face: 0
    };
    const secretKey = process.env["KEY_HASH_OBJECT"];
    //return hash object for id in redis
    return (0, md5_1.default)(JSON.stringify(fileInRedis) + secretKey);
}
exports.hashJson = hashJson;
