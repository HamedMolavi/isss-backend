import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { ApiError } from "../../types/classes/error.class";
import { getPathFromIdTime } from "../../tools/getPathFromIdTiem";
import { Access } from "../../types/enums/access.enum";
var ffmpeg = require("fluent-ffmpeg");
//get user role from enviroment variable
const const_role = process.env.const_role || "user";

//create router for add to server
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    //get parameter from url
    const dataVideo: string = req.params.id;
    const dataVideoList: string[] = dataVideo?.split(".");
    const videoPath = getPathFromIdTime(Number(dataVideoList[1]), dataVideoList[0].toString());
    await convertVideo(videoPath, "mp4");
    let videoName = videoPath.split("/");
    videoName = videoName[videoName.length - 1]?.split(".");
    let nameFileVideo2 = `${videoName[0]}.${videoName[1]}.${videoName[2]}_new.mp4`;
    let newVideoPath = path.join(videoPath, "./../") + nameFileVideo2;
    const videoStat = fs.statSync(newVideoPath);
    const fileSize = videoStat.size;
    const videoRange = req.headers.range;
    if (videoRange) {
      const parts = videoRange.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(newVideoPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(200, head);
      let read_stream = fs.createReadStream(newVideoPath);
      read_stream.pipe(res);
    }
  } catch (error: any) {
    return next(new ApiError(500, "internal server error" + error.message));
  }
});

export default router;

const convertVideo = (_path: any, format: any) => {
  console.log(_path);
  const fileName = _path.replace(/\.[^/.]+$/, "");
  const convertedFilePath = `${fileName}_new.${format}`;
  return new Promise((resolve, reject) => {
    ffmpeg(_path)
      .toFormat(format)
      .on("start", (commandLine: any) => {
        console.log(`Spawned Ffmpeg with command: ${commandLine}`);
      })
      .on("error", (err: any, stdout: any, stderr: any) => {
        console.log(err, stdout, stderr);
        reject(err);
      })
      .on("end", (stdout: any, stderr: any) => {
        console.log(stdout, stderr);
        resolve({ convertedFilePath });
      })
      .saveToFile(convertedFilePath);
  });
};
