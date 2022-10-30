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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const rtsp_video_recorder_1 = __importStar(require("rtsp-video-recorder"));
const fs_1 = __importDefault(require("fs"));
function recordStream(rtsp_link, camera_id) {
    if (rtsp_link === "") {
        return "";
    }
    let pathSave = path_1.default.join(__dirname, `./../../assets/video`);
    if (!fs_1.default.existsSync(pathSave)) {
        fs_1.default.mkdirSync(pathSave);
    }
    if (camera_id) {
        pathSave = path_1.default.join(__dirname, `./../../assets/video/${camera_id}`);
        if (!fs_1.default.existsSync(pathSave)) {
            fs_1.default.mkdirSync(pathSave);
        }
    }
    const recorder = new rtsp_video_recorder_1.default(rtsp_link, pathSave, {
        title: "Record video stream",
    });
    recorder.on(rtsp_video_recorder_1.RecorderEvents.FILE_CREATED, (...args) => console.log("file_created:", ...args));
    recorder.on(rtsp_video_recorder_1.RecorderEvents.PROGRESS, (...args) => console.log("progress:", ...args));
    recorder.on(rtsp_video_recorder_1.RecorderEvents.STOP, (...args) => console.log("stop:", ...args));
    recorder.on(rtsp_video_recorder_1.RecorderEvents.STOPPED, (...args) => console.log("stopped:", ...args));
    recorder.on(rtsp_video_recorder_1.RecorderEvents.START, (...args) => console.log("start:", ...args));
    recorder.on(rtsp_video_recorder_1.RecorderEvents.STARTED, (...args) => console.log("started:", ...args));
    return recorder;
}
exports.default = recordStream;
