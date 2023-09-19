import { NextFunction, Request, RequestHandler, Response } from "express";
import { ICameraInfo } from "../types/interfaces/camera.interface";
import { ApiError } from "../types/classes/error.class";
import { getStreamUriStrategy } from "../types/classes/camera.class";
import { cameraInfo } from "./takeSnaphsot";

export function getStreamUri(camInfo: ICameraInfo): RequestHandler {
  return async function middleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // setting up camInfo based on body
    for (const key in camInfo) if (Object.prototype.hasOwnProperty.call(camInfo, key)) camInfo[key] = req.body[key];
    let uri: string | undefined = await new getStreamUriStrategy({first:camInfo,second:camInfo.nvr, error:next}).do();
    if (!!uri) {
      req.body.url = uri;
      next();
    } else {
      req.flash("error", "rtsp link not found");
      return next(new ApiError(400, "rtsp link not found"));
    };
  };
};

// TODO: clean this up as above
const onvif = require("node-onvif");
export async function oldGetStreamUri(camInfo: cameraInfo): Promise<string | undefined> {
  try {
    if (!camInfo.ip || !camInfo.username || !camInfo.password || !camInfo.nvr) {
      return; // input verify
    }
    //create new device for camera on type onvif
    var device = new onvif.OnvifDevice({
      xaddr: "http://" + camInfo.ip + ":80/onvif/device_service",
      user: camInfo.username,
      pass: camInfo.password,
    });
    await device.init(); //initial device
    let url: string = device.getUdpStreamUrl();
    url = url.replace(
      /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      "{username}:{password}@{ip}:554"
    );
    return url;
  } catch (error) {
    console.log(error);
    const SAMPLE_STREAM_URI = process.env["SAMPLE_STREAM_URI"];
    const WORD_BEFORE_REPLACE_STREAM = process.env["WORD_BEFORE_REPLACE_STREAM"] ?? "c";
    const WORD_AFTER_REPLACE_STREAM = process.env["WORD_AFTER_REPLACE_STREAM"] ?? "c1";
    let url_nvr = SAMPLE_STREAM_URI?.replace(
      /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      "{username}:{password}@{ip}"
    );
    url_nvr = url_nvr?.replace( WORD_BEFORE_REPLACE_STREAM , WORD_AFTER_REPLACE_STREAM + camInfo.nvr);
    return url_nvr;
  }
}