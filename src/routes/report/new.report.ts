import { Request, Router } from "express";
import { readByIdElasticMiddleware, readElasticMiddleware } from "../../db/elastic/read.logs";
import { readMiddleware } from "../../db/mongo/read.database";
import Camera from "../../db/mongo/models/camera";
import Personnel from "../../db/mongo/models/personnel";
import Car from "../../db/mongo/models/car";
import Time from "../../tools/time.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { ReportFaceBody, ReportHumanBody, ReportPlateBody } from "../../validation/dto/report.dto";
import CarBrand from "../../db/mongo/models/carBrand";
import CarColor from "../../db/mongo/models/carColor";
import { injectDataMiddleware } from "../../tools/request.tools";
import { SearchHit } from "@elastic/elasticsearch/lib/api/types";
import { persianPlateDict, stringPlateToJson } from "../../tools/plate.tools";
import { injectAllKindOfStuff, unifiedSendFunction } from "../../tools/middleware.tools";
import { platesToStrings } from "../../tools/car.tools";
import { SearchRequest } from "@elastic/elasticsearch/lib/api/typesWithBodyKey";

//create router for add to routes file
const router: Router = Router();


router.get(["/plate", "/search"],
  // append cameras
  readMiddleware(Camera, undefined, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Car, undefined, { forceAll: true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
  readMiddleware(CarColor, undefined, { forceAll: true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
  readMiddleware(CarBrand, undefined, { forceAll: true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'color', 'brand']), { spread: true }),
  injectDataMiddleware(injectAllKindOfStuff(['car'], "number_plate"), { spread: true }),
  readElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log", { send: sendFunction }),
);
router.get("/plate/:id",
  // append cameras
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Car, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
  readMiddleware(CarColor, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
  readMiddleware(CarBrand, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'color', 'brand']), { spread: true }),
  injectDataMiddleware(injectAllKindOfStuff(['car'], "number_plate"), { spread: true }),
  readByIdElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log", { send: unifiedSendFunction }),
);
router.post("/plate",
  dtoValidationMiddleware(ReportPlateBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Car, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
  readMiddleware(CarColor, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
  readMiddleware(CarBrand, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'color', 'brand']), { spread: true }),
  injectDataMiddleware(injectAllKindOfStuff(['car'], "number_plate"), { spread: true }),
  readElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log", {
    searchFromBody: searchFunction,
    send: sendFunction
  }),
);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get("/face",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'personnel']), { spread: true }),
  readElasticMiddleware(process.env["FACE_INDEX"] ?? "face_log", { send: sendFunction }),
);
router.get("/face/:id",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'personnel']), { spread: true }),
  readByIdElasticMiddleware(process.env["FACE_INDEX"] ?? "face_log", { send: sendFunction }),
);
router.post("/face",
  dtoValidationMiddleware(ReportFaceBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'personnel']), { spread: true }),
  readElasticMiddleware(process.env["FACE_INDEX"] ?? "face_log", {
    searchFromBody: searchFunction,
    send: sendFunction
  }),
);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////



router.get("/sabotage",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readElasticMiddleware(process.env["SABOTAGE_INDEX"] ?? "sabotage_log", { send: sendLogMiddleware }),
);

router.get("/sabotage/:id",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera']), { spread: true }),
  readByIdElasticMiddleware(process.env["SABOTAGE_INDEX"] ?? "sabotage_log", { send: unifiedSendFunction }),
);


router.post("/sabotage",
  dtoValidationMiddleware(ReportFaceBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readElasticMiddleware(process.env["SABOTAGE_INDEX"] ?? "sabotage_log", { send: sendLogMiddleware }),
);


router.get("/human",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readElasticMiddleware(process.env["HUMAN_INDEX"] ?? "human_log", { send: sendLogMiddleware }),
);


router.get("/human/:id",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera']), { spread: true }),
  readByIdElasticMiddleware(process.env["HUMAN_INDEX"] ?? "human_log", { send: unifiedSendFunction })
);


router.post("/human",
  dtoValidationMiddleware(ReportHumanBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readElasticMiddleware(process.env["HUMAN_INDEX"] ?? "human_log", { send: sendLogMiddleware }),
);


function searchFunction(body: any) {
  let timezone = body.timez ?? body.timezone;
  const times_epoch: Array<{ gte: number, lte: number }> = body.date_start && Time.getEpochList(body.date_start, body.date_end, body.time_start, body.time_end, timezone);
  let plates = !!body.plates ? platesToStrings(body.plates) : [];
  const fields: { [key: string]: Array<any> } = {
    "plate_number": plates,
    "camera_id": body.cameras,
    "personnel_id": body.personnels,
    "brand": body.brands,
    "owner": body.owner,
    "color": body.colors,
    "human_count": body.human_count,
    "allowed": body.allowed === undefined || body.allowed === null ? [] : Array.isArray(body.allowed) ? body.allowed : [body.allowed]
  };
  const fieldQueries = Object.entries(fields).filter(([, values]) => !!values && values.length > 0).map(([field, values]) => ({
    bool: {
      should: values.map(value => ({
        term: {
          [`${field}`]: value
        }
      })),
      "minimum_should_match": 1
    }
  }));
  const timeQueries = !!times_epoch && !!times_epoch.length ? [{
    bool: { should: times_epoch.map(time => ({ range: { timestamp: { gte: time.gte, lte: time.lte } } })), "minimum_should_match": 1 }
  }] : [];
  const combinedQueries = [...fieldQueries, ...timeQueries];
  let query_elastic = {
    track_total_hits: true,
    query: {
      bool: {
        must: combinedQueries,
      }
    },
    sort: [{ timestamp: { order: "desc" } }]
  } as SearchRequest;
  return query_elastic;
};
function sendFunction(log: any, req: Request): any {
  try {
    const crop = req.body['elasticsearchIndices']?.at(-1) === "plate_log" ? log?.crop : log?.inner_crop ?? '';
    const inner_crop = req.body['elasticsearchIndices']?.at(-1) === "plate_log" ? log?.inner_crop : "";
    const camera = log.camera_id ? req.body['camera'][log.camera_id] : undefined;
    const personnel = (log.personnel_id && log.personnel_id !== "unknown") ? req.body['personnel'][log.personnel_id] : undefined;
    const department = req.body['camera'][log.camera_id]?.section_id?.department_id?.name ?? "";
    const section = req.body['camera'][log.camera_id]?.section_id?.name ?? "";
    const color = log?.color ? req.body['color'][log.color] : undefined;
    const brand = log?.brand ? req.body['brand'][log.brand] : undefined;
    return {
      _id: log?._id,
      camera_type: camera?.camera_type ?? "",
      camera_id: camera?._id?.toString() ?? "",
      camera: camera?.name ?? "",
      fullName: personnel?.toName() ?? "",
      department: personnel?.section_id?.department_id?.name ?? department,
      section: personnel?.section_id?.name ?? section,
      time: !!log?.timestamp ? new Date(log.timestamp).toLocaleString("en-US", { timeZone: req.query?.timezone?.toString() ?? "Asia/Tehran" }) : "",
      plate_number: log.plate_number ? stringPlateToJson(log.plate_number) : "",
      owner: log?.owner ?? "",
      color: color?.name ?? "",
      brand: brand?.name ?? "",
      allowed: log.allowed,
      crop: crop,
      video: camera?.url ?? "",
      inner_crop: inner_crop,
      alert: log?.alert,
      sms: log?.sms,
      description: log.description ?? "",
      human_count: log.human_count ?? 0,
    };
  } catch (err: any) {
    console.error(err)
    return undefined;
  }
};

export default router;
