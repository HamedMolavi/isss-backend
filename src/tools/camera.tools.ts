import { NextFunction, Request, RequestHandler, Response } from "express";
import { ICameraInfo } from "../types/interfaces/camera.interface";
import { ApiError } from "../types/classes/error.class";
import { getStreamUriStrategy } from "../types/classes/camera.class";

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
