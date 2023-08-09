import { NextFunction, Request, RequestHandler, Response } from "express";
import { ICameraInfo } from "../types/camera.interface";
import { ApiError } from "../error/error.handler";

const onvif = require("node-onvif");

export function getStreamUri(camInfo: ICameraInfo): RequestHandler {
  return async function middleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    let uri: string | undefined;
    try {
      // setting up camInfo based on body
      for (const key in camInfo) if (Object.prototype.hasOwnProperty.call(camInfo, key)) camInfo[key] = req.body[key];

      //create new device for camera on type onvif
      let device = new onvif.OnvifDevice({
        xaddr: "http://" + camInfo.ip + ":80/onvif/device_service",
        user: camInfo.username,
        pass: camInfo.password,
      });
      await device.init(); //initial device
      uri = device.getUdpStreamUrl();
      uri = uri?.replace(
        /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        "{username}:{password}@{ip}:554"
      );
    } catch (_) {
      try {
        const SAMPLE_STREAM_URI = process.env["SAMPLE_STREAM_URI"];
        const WORD_BEFORE_REPLACE_STREAM = process.env["WORD_BEFORE_REPLACE_STREAM"] ?? "c";
        const WORD_AFTER_REPLACE_STREAM = process.env["WORD_AFTER_REPLACE_STREAM"] ?? "c1";
        uri = SAMPLE_STREAM_URI?.replace(
          /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
          "{username}:{password}@{ip}"
        );
        uri = uri?.replace(WORD_BEFORE_REPLACE_STREAM, WORD_AFTER_REPLACE_STREAM + camInfo.nvr);
      } catch (error) {
        return next(new ApiError(500, String(error)));
      };
    };
    if (!!uri) {
      req.body.url = uri;
      next();
    } else {
      req.flash("error", "rtsp link not found");
      return next(new ApiError(400, "rtsp link not found"));
    };
  };
};
