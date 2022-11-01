import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { ApiError } from "../../error/error.handler";
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

    //convert time from epoch to date for get path video
    const dateVideo: string = new Date(Number(dataVideoList[1])).toLocaleDateString();
    const dateVideList: string[] = dateVideo.split("/");
    let dateVideListMaped = dateVideList.map((element) => {
      if (element.length == 1) {
        return "0" + element;
      }
      return element;
    });
    const nameFolderVideo: string = `${dateVideListMaped[2]}.${dateVideListMaped[0]}.${dateVideListMaped[1]}`;
    var options = { hour12: false };
    const timeVideo: string = new Date(Number(dataVideoList[1])).toLocaleTimeString("en-GB", options);
    const timeVideList: string[] = timeVideo.split(":");
    let timeVideListMaped = timeVideList.map((element) => {
      if (element.length == 1) {
        return "0" + element;
      }
      return element;
    });
    let nameFileVideo: string = `${timeVideListMaped[0]}.${timeVideListMaped[1]}.${timeVideListMaped[2]?.split(" ")[0]}.mp4`;
    let _path = path.join(__dirname, "./../../../assets/video");
    const videoPath = `${_path}/${dataVideoList[0]}/${nameFolderVideo}/${nameFileVideo}`;
    await convertVideo(videoPath, "mp4");
    await fs.unlinkSync(videoPath);
    let nameFileVideo2 = `${timeVideListMaped[0]}.${timeVideListMaped[1]}.${timeVideListMaped[2]?.split(" ")[0]}_new.mp4`;
    const newVideoPath = `${_path}/${dataVideoList[0]}/${nameFolderVideo}/${nameFileVideo2}`;
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
