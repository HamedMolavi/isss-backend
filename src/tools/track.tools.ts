import { Document, Types } from "mongoose";
import { ITrackLog } from "../types/interfaces/track.interface";
import { Request } from "express";
import Time from "./time.tools";

export function daySendFunction(track: (Document<unknown, any, ITrackLog> & Omit<ITrackLog & Required<{ _id: Types.ObjectId; }>, never>), req: Request) {
  return {
    ...(!!track.toJSON ? track.toJSON() : track),
    "day": (new Date(track.day * 86400000).toLocaleString("en-US", { timeZone: req.query.timezone?.toString() ?? "Asia/Tehran" })).split(",")[0],
    "data": track.data.map((data) => ({
      ...data,
      "camera_id": data.camera_id,
      "camera_name": req.body["cameras"]?.find((cam: any) => cam?._id.toString() === data.camera_id.toString())?.name,
      "camera_type": req.body["cameras"]?.find((cam: any) => cam?._id.toString() === data.camera_id.toString())?.camera_type,
      "start": new Date(data.start).toLocaleString("en-US", { timeZone: req.query.timezone?.toString() ?? "Asia/Tehran" }),
      "end": new Date(data.end).toLocaleString("en-US", { timeZone: req.query.timezone?.toString() ?? "Asia/Tehran" }),
      "duration": Time.hourToString((data.end - data.start) / 3600000),
      "milisecond_duration": (data.end - data.start)
    }))
  };
};