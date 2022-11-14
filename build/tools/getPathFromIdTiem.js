"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPathFromIdTime = void 0;
const path_1 = __importDefault(require("path"));
function getPathFromIdTime(timestamp, camera_id) {
    var _a;
    const dateVideo = new Date(Number(timestamp)).toLocaleDateString();
    const dateVideList = dateVideo.split("/");
    let dateVideListMaped = dateVideList.map((element) => {
        if (element.length == 1) {
            return "0" + element;
        }
        return element;
    });
    const nameFolderVideo = `${dateVideListMaped[2]}.${dateVideListMaped[0]}.${dateVideListMaped[1]}`;
    var options = { hour12: false };
    const timeVideo = new Date(Number(timestamp)).toLocaleTimeString("en-GB", options);
    const timeVideList = timeVideo.split(":");
    let timeVideListMaped = timeVideList.map((element) => {
        if (element.length == 1) {
            return "0" + element;
        }
        return element;
    });
    let nameFileVideo = `${timeVideListMaped[0]}.${timeVideListMaped[1]}.${(_a = timeVideListMaped[2]) === null || _a === void 0 ? void 0 : _a.split(" ")[0]}.mp4`;
    let _path = path_1.default.join(__dirname, "./../../assets/video");
    const videoPath = `${_path}/${camera_id}/${nameFolderVideo}/${nameFileVideo}`;
    return videoPath;
}
exports.getPathFromIdTime = getPathFromIdTime;
