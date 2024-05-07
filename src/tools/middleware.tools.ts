import { NextFunction, Request, Response } from "express";
import { stringPlateToJson } from "./plate.tools";
import { ITrackLog, TrackLogData } from "../types/interfaces/track.interface";
import { Types } from "mongoose";
import { ApiError } from "../types/classes/error.class";

export function injectAllKindOfStuff(stuff: string[], field: string = "_id") {
  return (body: any) => stuff.reduce((acc, entity) => {
    acc[entity] = body[entity]?.reduce((obj: any, item: any) => ({ ...obj, [item[field].toString()]: item }), {});
    return acc;
  }, {} as Record<string, any>)
}

export function unifiedSendFunction(log: any & { _id: string }, req: Request) {
  const { body } = req;
  // Check if log.plate_number is null or undefined before accessing properties
  const carDetails = !!log?.plate_number ? body?.["car"]?.[log.plate_number] : undefined;
  return {
    _id: log?._id,
    ...log,
    camera_id: !!log.camera_id ? body['camera']?.[log.camera_id]?._id?.toString() : "",
    camera: !!log.camera_id ? body['camera']?.[log.camera_id]?.name : "",
    camera_type: !!log.camera_id ? body['camera']?.[log.camera_id]?.type : "",
    fullName: (!!log.personnel_id && log.personnel_id !== "unknown") ? body['personnel']?.[log.personnel_id]?.toName() : "",
    time: !!log?.timestamp ? new Date(typeof log.timestamp === "string" ? Number(log.timestamp) : log.timestamp).toLocaleString("en-US", { timeZone: req.query?.timezone?.toString() ?? "Asia/Tehran" }) : "",
    timestamp: !!log?.timestamp ?? "",
    plate_number: !!log.plate_number ? stringPlateToJson(log.plate_number) : "",
    owner: !!carDetails ? carDetails?.owner?.toName() : "",
    color: !!log?.color ? body['color']?.[log.color]?.name : "",
    brand: !!log?.brand ? body['brand']?.[log.brand]?.name : "",
    department: body['camera']?.[log.camera_id]?.section_id?.department_id?.name ?? "",
    section: body['camera']?.[log.camera_id]?.section_id?.name ?? "",
    allowed: log.allowed,
    crop: log.plate_number !== undefined ? log?.crop : log?.inner_crop,
    inner_crop: log.plate_number !== undefined ? log?.inner_crop : "",
    video: !!log.camera_id ? body['camera'][log.camera_id]?.url : "",
  };
}

interface ExtendedTrackLogData extends TrackLogData {
  crop?: (string | undefined)[];
}
interface localTrackLog extends ITrackLog {
  data: Array<ExtendedTrackLogData>
}
export function dataCollector(logs: (undefined | { camera_id?: string; timestamp?: number; personnel_id?: string; inner_crop?: string; })[]) {
  return logs.reverse().reduce((result: localTrackLog[], log) => {
    if (!log || typeof (log["timestamp"]) !== "number" || typeof (log["camera_id"]) !== "string") return result;
    let nowDay = Math.floor(log["timestamp"] / 86400000);
    let lastDay = Math.floor(result.at(-1)?.["day"] ?? 0);
    if (lastDay !== nowDay) {
      // push new record
      result.push({
        "_id": new Types.ObjectId(), "day": nowDay, "uid": log?.["personnel_id"] ?? "", "data": [
          {
            "camera_id": log["camera_id"],
            "crop": [log["inner_crop"]],
            "start": log["timestamp"],
            "end": log["timestamp"],
          },
        ]
      })
    } else {
      //update last record
      if (result.at(-1)?.['data'].at(-1)?.["camera_id"] === log['camera_id']) {
        let lastDataRecord = result.at(-1)?.['data']?.pop() ?? { "camera_id": log["camera_id"], "start": log["timestamp"] ?? 0, "end": 0 };
        lastDataRecord['end'] = log["timestamp"];
        lastDataRecord['crop']?.push(log["inner_crop"]);
        result.at(-1)?.['data']?.push(lastDataRecord);
      } else {
        result.at(-1)?.['data'].push({
          'camera_id': log['camera_id'],
          'start': log["timestamp"],
          "crop": [log["inner_crop"]],
          'end': log["timestamp"]
        })
      }
    }
    return result;
  }, [] as localTrackLog[])
}

export function sendDataMiddleware(fn: CallableFunction, options?: { params?: boolean, forceAll?: boolean }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let data: any = await fn(!!options?.params ? req.params : req.body)
      if (!data) {
        req.flash("error", "Data not found!");
        return next(new ApiError(404, "Data not found!"));
      };
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = strPerPage?.toLowerCase() === "all"
        ? 10000
        : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
      let start = ((page > 1 ? page : 1) - 1) * perPage;
      let total = Object.prototype.hasOwnProperty.call(data, "length") ? data.length : undefined;
      if ((data.length ?? 0) > perPage && !options?.forceAll) data = data.slice(start, start + perPage);
      return res.status(200).json({
        success: true,
        data,
        page: page,
        perPage: perPage,
        total,
        pages: Math.ceil((total ?? 0) / perPage),
      });
    } catch (error: any) {
      req.flash("error", "Internal Error!" + error.message);
      return next(new ApiError(500, "Internal Error!" + error.message));
    };
  };
};