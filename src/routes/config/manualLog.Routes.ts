import { Router } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreatePlateLogBody } from "../../validation/dto/plateLog.dto";
import { createLogMiddleware } from "../../db/elastic/createLog";
import { Plate } from "../../db/elastic/model/plate";


//create router for add to server file
const router: Router = Router();


router.post("/plate",
    dtoValidationMiddleware(CreatePlateLogBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    createLogMiddleware("plate_log", Plate,["color","brand","camera_id","plate_number"])
);


export default router;
