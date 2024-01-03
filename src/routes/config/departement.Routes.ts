import { Router, Request, Response, NextFunction } from "express";
import Departement from "../../db/mongo/models/department";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateDepartmentBody, UpdateDepartmentBody } from "../../validation/dto/department.dto";
import { existCheck } from "../../validation/db";
import Department from "../../db/mongo/models/department";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import Section from "../../db/mongo/models/section";
import mongoose from "mongoose";
import Camera from "../../db/mongo/models/camera";
import Personnel from "../../db/mongo/models/personnel";
import Car from "../../db/mongo/models/car";
import { docSendMiddleware } from "../../tools/request.tools";

//create router for add to server file
const router: Router = Router();

//add route for register new departement
router.post("",
  dtoValidationMiddleware(CreateDepartmentBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Department, { $and: [{ name: "name" }], }, "Department already exists!"),
  createMiddleware(["name", "created_date", "is_enabled"], Department),
);

//route for get departements list
router.get("",
  readMiddleware(Department, (search) => { return { name: { $regex: search, $options: "i" } } }),
);

//route for get all information with this department from DB
router.get(["/sections", "/cameras", "/white", "/white/personnel", "/white/cars"].map((el) => "/:id" + el),
  // append sections
  readMiddleware(Section, (search) => { return { department_id: new mongoose.Types.ObjectId(search) } }, { populate: true, next: true, save: "sections", searchFromParams: (params) => params.id }),
  // append cameras
  readMiddleware(Camera, makeSearchFnWithOr("section_id"), { populate: true, searchFromBody: makesearchFromBody("sections"), next: true, save: "cameras" }),
  // append personnel
  readMiddleware(Personnel, makeSearchFnWithOr("camera_whitelist", { includes: true }), { populate: true, searchFromBody: makesearchFromBody("cameras"), next: true, save: "personnel" }),
  // append cars
  readMiddleware(Car, makeSearchFnWithOr("camera_whitelist", { includes: true }), { populate: true, searchFromBody: makesearchFromBody("cameras"), next: true, save: "cars" }),
);

router.get("/:id/sections", docSendMiddleware("sections"));
router.get("/:id/cameras", docSendMiddleware("cameras"));
router.get("/:id/white/personnel", docSendMiddleware("personnel"));
router.get("/:id/white/cars", docSendMiddleware("cars"));
router.get("/:id/white", docSendMiddleware(["cars", "personnel"]));

//route for get departement by id from DB
router.get("/:id",
  readByIdMiddleware(Departement),
);

//add route for edit departement
router.patch("/:id",
  dtoValidationMiddleware(UpdateDepartmentBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  updateByIdMiddleware(Departement, { ignore: ["created_date"] })
);

//add route for delete departement
router.delete("/:id",
  deleteByIdMiddleware(Departement)
);

function makeSearchFnWithOr(field: string, options?: { includes?: boolean }) {
  return function searchFn(search: string) {
    let query: { $or: Array<{ [key: string]: any }> } = { $or: [] };
    for (const id of search.split(",")) if (!!id) query["$or"].push({
      [field]: !!options?.includes ? { $in: [new mongoose.Types.ObjectId(search)] } : new mongoose.Types.ObjectId(id)
    });
    return query;
  }
};
function makesearchFromBody(bodyFieldName: string) {
  return function searchFromBody(body: any) {
    let ids: string[] = [];
    for (const doc of body[bodyFieldName]) ids.push(doc.id);
    return ids.join(',');
  }
}


export default router;
