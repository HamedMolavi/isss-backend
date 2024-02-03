import { Router } from "express";
import { filterLogsMiddleware, readElasticMiddleware, sendLogMiddleware } from "../../db/elastic/read.logs";
import { readMiddleware } from "../../db/mongo/read.database";
import Camera from "../../db/mongo/models/camera";
import Personnel from "../../db/mongo/models/personnel";
import Car from "../../db/mongo/models/car";
import Time from "../../tools/time.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { ReportFaceBody, ReportPlateBody } from "../../validation/dto/report.dto";
import CarBrand from "../../db/mongo/models/carBrand";
import CarColor from "../../db/mongo/models/carColor";

//create router for add to routes file
const router: Router = Router();



router.get(["/plate", "/search"],
    // append cameras
    readMiddleware(Camera, () => { return {} }, { populate: true, next: true, save: "camera" }),
    readMiddleware(Car, () => { return {} }, { populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
    readMiddleware(CarColor, () => { return {} }, { populate: true, forcePopulate: ["color"], next: true, save: "color" }),
    readMiddleware(CarBrand, () => { return {} }, { populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
    readElasticMiddleware("plate_log", { next: true, save: "logs" }),
    sendLogMiddleware()

);




router.post("/plate",
    dtoValidationMiddleware(ReportPlateBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    Time.compareTimeMiddleware("start", "stop"),
    readMiddleware(Camera, () => { return {} }, { populate: true, next: true, save: "camera" }),
    readMiddleware(Car, () => { return {} }, { populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
    readMiddleware(CarColor, () => { return {} }, { populate: true, forcePopulate: ["color"], next: true, save: "color" }),
    readMiddleware(CarBrand, () => { return {} }, { populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
    readElasticMiddleware("plate_log", { next: true, save: "logs" }),
    filterLogsMiddleware({ next: true, save: "logs" }),
    sendLogMiddleware()
);


router.get("/face",
    readMiddleware(Camera, () => { return {} }, { populate: true, next: true, save: "camera" }),
    readMiddleware(Personnel, () => { return {} }, { populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
    readElasticMiddleware("facearc_log", { next: true, save: "logs" }),
    sendLogMiddleware()
);


router.post("/face",
    dtoValidationMiddleware(ReportFaceBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    Time.compareTimeMiddleware("start", "stop"),
    readMiddleware(Camera, () => { return {} }, { populate: true, next: true, save: "camera" }),
    readMiddleware(Personnel, () => { return {} }, { populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
    readElasticMiddleware("facearc_log", { next: true, save: "logs" }),
    filterLogsMiddleware({ next: true, save: "logs" }),
    sendLogMiddleware()
);

export default router;
