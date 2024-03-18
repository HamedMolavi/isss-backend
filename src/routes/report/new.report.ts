import { Router } from "express";
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

//create router for add to routes file
const router: Router = Router();



router.get(["/plate", "/search"],
    // append cameras
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readMiddleware(Car, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
    readMiddleware(CarColor, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
    readMiddleware(CarBrand, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
    readElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log", { next: true, save: "logs" }),
    sendLogMiddleware()
);

router.get("/plate/:id",
    // append cameras
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readMiddleware(Car, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
    readMiddleware(CarColor, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
    readMiddleware(CarBrand, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
    readByIdElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log"),
);




router.post("/plate",
    dtoValidationMiddleware(ReportPlateBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    Time.compareTimeMiddleware("start", "stop"),
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readMiddleware(Car, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
    readMiddleware(CarColor, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
    readMiddleware(CarBrand, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
    readElasticMiddleware(process.env["PLATE_INDEX"] ?? "plate_log", { next: true, save: "logs" }),
    filterLogsMiddleware({ next: true, save: "logs" }),
    sendLogMiddleware()
);


router.get("/face",
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readMiddleware(Personnel, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
    readElasticMiddleware(process.env["FACE_INDEX"] ?? "facearc_log", { next: true, save: "logs" }),
    sendLogMiddleware()
);
router.get("/face/:id",
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readMiddleware(Personnel, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
    readByIdElasticMiddleware(process.env["FACE_INDEX"] ?? "facearc_log"),
);


router.post("/face",
    dtoValidationMiddleware(ReportFaceBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    Time.compareTimeMiddleware("start", "stop"),
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readMiddleware(Personnel, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
    readElasticMiddleware(process.env["FACE_INDEX"] ?? "facearc_log", { next: true, save: "logs" }),
    filterLogsMiddleware({ next: true, save: "logs" }),
    sendLogMiddleware()
);



router.get("/sabotage",
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readElasticMiddleware(process.env["SABOTAGE_INDEX"] ?? "sabotage_log", { next: true, save: "logs" }),
    sendLogMiddleware()
);

router.get("/sabotage/:id",
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readByIdElasticMiddleware(process.env["SABOTAGE_INDEX"] ?? "sabotage_log")
);


router.post("/sabotage",
    dtoValidationMiddleware(ReportFaceBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    Time.compareTimeMiddleware("start", "stop"),
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readElasticMiddleware(process.env["SABOTAGE_INDEX"] ?? "sabotage_log", { next: true, save: "logs" }),
    filterLogsMiddleware({ next: true, save: "logs" }),
    sendLogMiddleware()
);


router.get("/human",
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readElasticMiddleware(process.env["HUMAN_INDEX"] ?? "human_log", { next: true, save: "logs" }),
    sendLogMiddleware()
);


router.get("/human/:id",
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readByIdElasticMiddleware(process.env["HUMAN_INDEX"] ?? "human_log")
);

router.post("/human",
    dtoValidationMiddleware(ReportHumanBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    Time.compareTimeMiddleware("start", "stop"),
    readMiddleware(Camera, () => { return {} }, { forceAll:true, populate: true, forcePopulate: ["section_id", "department_id"],next: true, save: "camera" }),
    readElasticMiddleware(process.env["HUMAN_INDEX"] ?? "human_log", { next: true, save: "logs" }),
    filterLogsMiddleware({ next: true, save: "logs" }),
    sendLogMiddleware()
);


export default router;
