import { Request, Router } from "express";
import { filterLogsMiddleware, readByIdElasticMiddleware, readElasticMiddleware, sendLogMiddleware } from "../../db/elastic/read.logs";
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
import { persianPlateDict } from "../../tools/plate.tools";

//create router for add to routes file
const router: Router = Router();



router.get(["/plate", "/search"],
  // append cameras
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Car, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
  readMiddleware(CarColor, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
  readMiddleware(CarBrand, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
  readElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log", { next: true, save: "logs" }),
  sendLogMiddleware()
);

router.get("/plate/:id",
  // append cameras
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Car, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
  readMiddleware(CarColor, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
  readMiddleware(CarBrand, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'color', 'brand']), { spread: true }),
  injectDataMiddleware(injectObjectedCars, { injData: "car" }),
  readByIdElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log", { send: unifiedSendFunction }),
);




router.post("/plate",
  dtoValidationMiddleware(ReportPlateBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Car, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
  readMiddleware(CarColor, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
  readMiddleware(CarBrand, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
  readElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log", { next: true, save: "logs" }),
  filterLogsMiddleware({ next: true, save: "logs" }),
  sendLogMiddleware()
);


router.get("/face",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
  readElasticMiddleware(process.env["FACE_INDEX"] ?? "facearc_log", { next: true, save: "logs" }),
  sendLogMiddleware()
);
router.get("/face/:id",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'personnel']), { spread: true }),
  readByIdElasticMiddleware(process.env["FACE_INDEX"] ?? "facearc_log", { send: unifiedSendFunction }),
);


router.post("/face",
  dtoValidationMiddleware(ReportFaceBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
  readElasticMiddleware(process.env["FACE_INDEX"] ?? "facearc_log", { next: true, save: "logs" }),
  filterLogsMiddleware({ next: true, save: "logs" }),
  sendLogMiddleware()
);



router.get("/sabotage",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readElasticMiddleware(process.env["SABOTAGE_INDEX"] ?? "sabotage_log", { next: true, save: "logs" }),
  sendLogMiddleware()
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
  readElasticMiddleware(process.env["SABOTAGE_INDEX"] ?? "sabotage_log", { next: true, save: "logs" }),
  filterLogsMiddleware({ next: true, save: "logs" }),
  sendLogMiddleware()
);


router.get("/human",
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readElasticMiddleware(process.env["HUMAN_INDEX"] ?? "human_log", { next: true, save: "logs" }),
  sendLogMiddleware()
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
  readElasticMiddleware(process.env["HUMAN_INDEX"] ?? "human_log", { next: true, save: "logs" }),
  filterLogsMiddleware({ next: true, save: "logs" }),
  sendLogMiddleware()
);


function injectAllKindOfStuff(stuff: string[]) {
  return (body: any) => stuff.reduce((acc, entity) => {
    acc[entity] = body[entity]?.reduce((obj: any, item: any) => ({ ...obj, [item._id.toString()]: item }), {});
    return acc;
  }, {} as Record<string, any>)
}
function injectObjectedCars(body: any) {
  return !!Array.isArray(body["car"]) ? body["car"].reduce((pre, car) => ({ ...pre, [car.number_plate.toString()]: car }), {} as { [key: string]: any }) : body["car"]
}
function unifiedSendFunction(log: any & { _id: string }, req: Request) {
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
    plate_number: !!log.plate_number ? stringPlateToJson(log.plate_number) : "",
    owner: !!carDetails ? carDetails?.owner?.toName() : "",
    color: !!log?.color ? body['color']?.[log.color]?.name : "",
    brand: !!log?.brand ? body['brand']?.[log.brand]?.name : "",
    department: body['camera']?.[log.camera_id]?.section_id?.department_id?.name ?? "",
    section: body['camera']?.[log.camera_id]?.section_id?.name ?? "",
    allowed: log.allowed,
    crop: log?.crop ?? "",
    inner_crop: log?.inner_crop ?? "",
    video: !!log.camera_id ? body['camera'][log.camera_id]?.url : "",
  };
}

function stringPlateToJson(plate_number: string) {
  let plateNumber1 = !!plate_number.substr(0, 2).match(new RegExp(/\*/)) ? plate_number.substr(0, 2) : Number(plate_number.substr(0, 2)).toLocaleString("fa-IR");
  let plateNumber2 = !!plate_number.substr(2, 1).match(new RegExp(/\*/)) ? plate_number.substr(2, 1) : persianPlateDict[plate_number.substr(2, 1)];
  let plateNumber3 = !!plate_number.substr(3, 3).match(new RegExp(/\*/)) ? plate_number.substr(3, 3) : Number(plate_number.substr(3, 3)).toLocaleString("fa-IR");
  let plateNumber4 = !!plate_number.substr(6, 2).match(new RegExp(/\*/)) ? plate_number.substr(6, 2) : Number(plate_number.substr(6, 2)).toLocaleString("fa-IR");
  //add plate number to json response for sort persian format in font end
  return {
    first: plateNumber1,
    second: plateNumber2,
    third: plateNumber3,
    fourth: "ایران",
    fifth: plateNumber4,
  };
};

export default router;
