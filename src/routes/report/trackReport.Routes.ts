import { NextFunction, Router, Request, Response } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { readMiddleware, readByIdMiddleware } from "../../db/mongo/read.database";
import mongoose, { Document, FilterQuery, Model, Types } from "mongoose";
import Track from "../../db/mongo/models/track";
import { ReadTrackBody } from "../../validation/dto/track.dto";
import Time from "../../tools/time.tools";
import { ITrackLog } from "../../types/interfaces/track.interface";

//create router for add to server
const router: Router = Router();
//add route for register new camera
router.post(
  "",
  dtoValidationMiddleware(ReadTrackBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  readMiddleware(Track, searchFunction, { populate: true, send: sendFunction, searchFromBody })
);
function sendFunction(track: (Document<unknown, any, ITrackLog> & Omit<ITrackLog & Required<{ _id: Types.ObjectId; }>, never>), req: Request) {
  return {
    ...track.toJSON(),
    "day": (new Date(track.day * 86400000).toLocaleString("en-US", { timeZone: "Asia/Tehran" })).split(",")[0],
    "data": track.data.map((data) => ({
      "camera_id": data.camera_id,
      "start": new Date(data.start).toLocaleString("en-US", { timeZone: "Asia/Tehran" }),
      "end": new Date(data.end).toLocaleString("en-US", { timeZone: "Asia/Tehran" }),
      "duration": Time.hourToString((data.end - data.start) / 3600000)
    }))
  };
};
function searchFromBody(body: { "personnel_id"?: string, "number_plate"?: string, "date_start"?: string, "date_end"?: string, }) {
  const uid = body.personnel_id ?? body.number_plate;
  let start = !!body.date_start ? Math.floor((new Date(body.date_start + " 00:01" + Time.getUtcOffset("Asia/Tehran"))).getTime() / 86400000)
    : 0;
  let end = !!body.date_end ? Math.floor((new Date(body.date_end + " 00:01" + Time.getUtcOffset("Asia/Tehran"))).getTime() / 86400000)
    : 99736854;
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
export default router;
