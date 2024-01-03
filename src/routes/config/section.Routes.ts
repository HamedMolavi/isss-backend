import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import Section from "../../db/mongo/models/section";
import { ISection } from "../../types/interfaces/section.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateSectionBody } from "../../validation/dto/section.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import Camera from "../../db/mongo/models/camera";
import mongoose from "mongoose";
import Personnel from "../../db/mongo/models/personnel";
import { docSendMiddleware, makeSearchFnWithOr, makesearchFromBody } from "../../tools/request.tools";
import Car from "../../db/mongo/models/car";

//create router for add to routes file
const router: Router = Router();

//add route for register new section
router.post("",
  dtoValidationMiddleware(CreateSectionBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Section, { $and: [{ name: "name" }, { department_id: "department_id" }] }, "Camera already exists!"),
  createMiddleware(["name", "department_id"], Section),
);

//route for get sections list
router.get("",
  readMiddleware(Section, (search) => { return { ip: { $regex: search, $options: "i" } } }, { populate: true })
);

//route for get all information with this department from DB
router.get(["/cameras", "/white", "/white/personnel", "/white/cars"].map((el) => "/:id" + el),
  // append cameras
  readMiddleware(Camera, (search) => { return { section_id: new mongoose.Types.ObjectId(search) } }, { populate: true, next: true, save: "cameras", searchFromParams: (params) => params.id }),
  // append personnel
  readMiddleware(Personnel, makeSearchFnWithOr("camera_whitelist", { includes: true }), { populate: true, searchFromBody: makesearchFromBody("cameras"), next: true, save: "personnel" }),
  // append cars
  readMiddleware(Car, makeSearchFnWithOr("camera_whitelist", { includes: true }), { populate: true, searchFromBody: makesearchFromBody("cameras"), next: true, save: "cars" }),
);

router.get("/:id/cameras", docSendMiddleware("cameras"));
router.get("/:id/white/personnel", docSendMiddleware("personnel"));
router.get("/:id/white/cars", docSendMiddleware("cars"));
router.get("/:id/white", docSendMiddleware(["cars", "personnel"]));

//route for get section by id from DB
router.get("/:id",
  readByIdMiddleware(Section, { populate: true })
);

//add route for edit section
router.patch("/:id",
  updateByIdMiddleware(Section),
);

//add route for delete section
router.delete("/:id",
  deleteByIdMiddleware(Section),
);

export default router;
