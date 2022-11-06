import path from "path";
import Recorder, { RecorderEvents } from "rtsp-video-recorder";
import fs from "fs";


function recordStream(rtsp_link: string, camera_id: string | undefined) {
  if (rtsp_link === "") {
    return "";
  }
  let pathSave = path.join(__dirname, `./../../assets/video`);
  if (!fs.existsSync(pathSave)) {
    fs.mkdirSync(pathSave);
  }
  if (camera_id) {
    pathSave = path.join(__dirname, `./../../assets/video/${camera_id}`);
    if (!fs.existsSync(pathSave)) {
      fs.mkdirSync(pathSave);
    }
  }

  const recorder = new Recorder(rtsp_link, pathSave, {
    title: "Record video stream",
  });

  recorder.on(RecorderEvents.FILE_CREATED, (...args) => console.log("file_created:", ...args));
  recorder.on(RecorderEvents.PROGRESS, (...args) => console.log("progress:", ...args));
  recorder.on(RecorderEvents.STOP, (...args) => console.log("stop:", ...args));
  recorder.on(RecorderEvents.STOPPED, (...args) => console.log("stopped:", ...args));
  recorder.on(RecorderEvents.START, (...args) => console.log("start:", ...args));
  recorder.on(RecorderEvents.STARTED, (...args) => console.log("started:", ...args));

  return recorder;
}

export default recordStream;
