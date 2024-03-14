import { NextFunction, Router, Request, Response } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { readMiddleware, readByIdMiddleware } from "../../db/mongo/read.database";
import mongoose, { Document, FilterQuery, Model, Types } from "mongoose";
import Track from "../../db/mongo/models/track";
import { ReadTrackBody } from "../../validation/dto/track.dto";
import Time from "../../tools/time.tools";
import { ITrackLog } from "../../types/interfaces/track.interface";
import { ApiError } from "../../types/classes/error.class";
import Camera from "../../db/mongo/models/camera";
import { range } from "../../tools/utils.tools";

//create router for add to server
const router: Router = Router();
// get track data
router.post(
  "/cumulative",
  dtoValidationMiddleware(ReadTrackBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  readMiddleware(Camera, undefined, { next: true, save: "cameras" }),
  readMiddleware(Track, searchFunction, { populate: true, next: true, save: "trackData", searchFromBody }),
  cumulativeSendFunction
);
router.post(
  "",
  dtoValidationMiddleware(ReadTrackBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  readMiddleware(Camera, undefined, { next: true, save: "cameras" }),
  readMiddleware(Track, searchFunction, { populate: true, send: daySendFunction, searchFromBody })
);



function searchFromBody(body: { "personnel_id"?: string, "number_plate"?: string, "date_start"?: string, "date_end"?: string, } & { "day_start"?: number; "day_end"?: number }) {
  const uid = body.personnel_id ?? body.number_plate;
  let start = !!body.date_start ? Math.floor((new Date(body.date_start + " 00:01" + Time.getUtcOffset("Asia/Tehran"))).getTime() / 86400000)
    : 19794;
  let end = !!body.date_end ? Math.floor((new Date(body.date_end + " 00:01" + Time.getUtcOffset("Asia/Tehran"))).getTime() / 86400000)
    : 20000;
  body["day_start"] = start;
  body["day_end"] = end;
  return JSON.stringify({ uid, start, end });
}
function searchFunction(search: string): FilterQuery<any> {
  const searchJson = JSON.parse(search);
  return {
    uid: searchJson?.uid,
    day: {
      $gte: searchJson?.start,
      $lte: searchJson?.end
    }
  }
};
function daySendFunction(track: (Document<unknown, any, ITrackLog> & Omit<ITrackLog & Required<{ _id: Types.ObjectId; }>, never>), req: Request) {
  return {
    ...track.toJSON(),
    "day": (new Date(track.day * 86400000).toLocaleString("en-US", { timeZone: "Asia/Tehran" })).split(",")[0],
    "data": track.data.map((data) => ({
      "camera_id": data.camera_id,
      "camera_name": req.body["cameras"]?.find((cam: any) => cam?._id.toString() === data.camera_id.toString())?.name,
      "camera_type": req.body["cameras"]?.find((cam: any) => cam?._id.toString() === data.camera_id.toString())?.camera_type,
      "start": new Date(data.start).toLocaleString("en-US", { timeZone: "Asia/Tehran" }),
      "end": new Date(data.end).toLocaleString("en-US", { timeZone: "Asia/Tehran" }),
      "duration": Time.hourToString((data.end - data.start) / 3600000),
      "milisecond_duration": (data.end - data.start)
    }))
  };
};
function cumulativeSendFunction(req: Request, res: Response, next: NextFunction) {
  try {
    type T1 = { "camera_id": string; "camera_name": string; "start": number; "end": number; "duration": number };
    type T2 = { "_id": string; "uid": string; "day": number; "data": T1[] }

    let data: { "camera_name": string; "data": number[] }[] = [];
    let cameras: Set<string> = new Set(req.body?.trackData.flatMap((el: T2) => el.data).map((el: T1) => el.camera_id));
    let flatData: Array<T1 & { "day": number }> = req.body.trackData.flatMap((el: T2) => el.data.map(data => ({ ...data, "day": el.day })));

    for (const camera of cameras) {
      data.push({
        "camera_name": req.body["cameras"].find((el: any) => camera === el.id)?.name,
        "data": range(req.body["day_start"], req.body["day_end"]).map(day => flatData.filter((data) => data.camera_id === camera && data.day === day).reduce((res, data) => data.end - data.start + res, 0))
      })
    }
    let strPage = req.query.page as string;
    let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
    let strPerPage = req.query.perPage as string;
    let perPage = strPerPage?.toLowerCase() === "all"
      ? 10000
      : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
    return res.status(200).json({
      success: true,
      data,
      page: page,
      perPage: perPage,
      total: data.length,
      pages: Math.ceil((data.length) / perPage),
    });

  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
};
export default router;
