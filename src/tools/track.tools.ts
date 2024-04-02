import { Document, Types } from "mongoose";
import { ITrackLog } from "../types/interfaces/track.interface";
import { Request } from "express";
import Time from "./time.tools";
import { range } from "./utils.tools";

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

export function cumulativeSendFunction(body: any) {
  type T1 = { "camera_id": string; "camera_name": string; "start": number; "end": number; "duration": number };
  type T2 = { "_id": string; "uid": string; "day": number; "data": T1[] }

  let data: { "camera_id": string; "duration": number; "camera_name": string; "data": number[] }[] = [];
  let cameras: Set<string> = new Set(body?.trackData?.flatMap((el: T2) => el.data)?.map((el: T1) => el.camera_id));
  let flatData: Array<T1 & { "day": number }> = body?.trackData?.flatMap((el: T2) => el.data.map(data => ({ ...data, "day": el.day })));

  for (const camera of cameras) {
    data[data.push({
      "camera_id": camera,
      "camera_name": body?.["cameras"]?.find((el: any) => camera === el.id)?.name,
      "data": range(body?.["day_start"], body["day_end"]).map(day => flatData.filter((data) => data.camera_id === camera && data.day === day).reduce((res, data) => data.end - data.start + res, 0)),
      "duration": 0
    }) - 1]["duration"] = data.at(-1)?.data?.reduce((res, el) => res + el, 0) ?? 0;
  }
  return data;
};