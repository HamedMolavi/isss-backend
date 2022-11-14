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
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const error_handler_1 = require("../../error/error.handler");
const getPathFromIdTiem_1 = require("../../tools/getPathFromIdTiem");
var ffmpeg = require("fluent-ffmpeg");
//get user role from enviroment variable
const const_role = process.env.const_role || "user";
//create router for add to server
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
router.get("/:id", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        //get parameter from url
        const dataVideo = req.params.id;
        const dataVideoList = dataVideo === null || dataVideo === void 0 ? void 0 : dataVideo.split(".");
        const videoPath = (0, getPathFromIdTiem_1.getPathFromIdTime)(Number(dataVideoList[1]), dataVideoList[0].toString());
        yield convertVideo(videoPath, "mp4");
        let videoName = videoPath.split("/");
        videoName = (_a = videoName[videoName.length - 1]) === null || _a === void 0 ? void 0 : _a.split(".");
        let nameFileVideo2 = `${videoName[0]}.${videoName[1]}.${videoName[2]}_new.mp4`;
        let newVideoPath = path_1.default.join(videoPath, "./../") + nameFileVideo2;
        const videoStat = fs_1.default.statSync(newVideoPath);
        const fileSize = videoStat.size;
        const videoRange = req.headers.range;
        if (videoRange) {
            const parts = videoRange.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;
            const file = fs_1.default.createReadStream(newVideoPath, { start, end });
            const head = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize,
                "Content-Type": "video/mp4",
            };
            res.writeHead(206, head);
            file.pipe(res);
        }
        else {
            const head = {
                "Content-Length": fileSize,
                "Content-Type": "video/mp4",
            };
            res.writeHead(200, head);
            let read_stream = fs_1.default.createReadStream(newVideoPath);
            read_stream.pipe(res);
        }
    }
    catch (error) {
        return next(new error_handler_1.ApiError(500, "internal server error" + error.message));
    }
}));
exports.default = router;
const convertVideo = (_path, format) => {
    console.log(_path);
    const fileName = _path.replace(/\.[^/.]+$/, "");
    const convertedFilePath = `${fileName}_new.${format}`;
    return new Promise((resolve, reject) => {
        ffmpeg(_path)
            .toFormat(format)
            .on("start", (commandLine) => {
            console.log(`Spawned Ffmpeg with command: ${commandLine}`);
        })
            .on("error", (err, stdout, stderr) => {
            console.log(err, stdout, stderr);
            reject(err);
        })
            .on("end", (stdout, stderr) => {
            console.log(stdout, stderr);
            resolve({ convertedFilePath });
        })
            .saveToFile(convertedFilePath);
    });
};
