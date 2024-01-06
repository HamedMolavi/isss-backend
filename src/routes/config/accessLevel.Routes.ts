import { Router, Request, Response, NextFunction } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import mongoose, { Document } from "mongoose";
import AccessLevel from "../../db/mongo/models/accessLevel";
import { CreateAccessLevelBody } from "../../validation/dto/accessLevel.dto";
import { ApiError } from "../../types/classes/error.class";

//create router for add to routes file
const router: Router = Router();

//add route for register new AccessLevel
router.post("",
  dtoValidationMiddleware(CreateAccessLevelBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(AccessLevel, { $and: [{ name: "name" }] }, "AccessLevel already exists!"),
  createMiddleware(["name", "camera", "car", "color", "brand", "section", "department", "job", "personnel", "schedule", "user", "typeName", "systemLog"], AccessLevel),
);

//route for get personnels list
router.get("",
  readMiddleware(AccessLevel)
);

//route for get personnel by id from DB
router.get("/:id",
  readByIdMiddleware(AccessLevel)
);

//add route for edit personnel
router.patch("/:id",
  // $and: [{ _id: new mongoose.Types.ObjectId(search) }, { name: "admin" }] 
  readMiddleware(AccessLevel, (search: string) => { return { name: "admin", _id: new mongoose.Types.ObjectId(search) } }, { searchFromParams: (params) => params.id, next: true, save: 'adminAL' }),
  (req, res, next) => {
    if (!!req.body["adminAL"].length) {
      req.flash("error", "Can't change admin access level.");
      return next(new ApiError(404, "Can't change admin access level."));
    };
    return next();
  },
  updateByIdMiddleware(AccessLevel),
);

//add route for delete personnel
router.delete("/:id",
  // $and: [{ _id: new mongoose.Types.ObjectId(search) }, { name: "admin" }] 
  readMiddleware(AccessLevel, (search: string) => { return { name: "admin", _id: new mongoose.Types.ObjectId(search) } }, { searchFromParams: (params) => params.id, next: true, save: 'adminAL' }),
  (req, res, next) => {
    if (!!req.body["adminAL"].length) {
      req.flash("error", "Can't change admin access level.");
      return next(new ApiError(404, "Can't change admin access level."));
    };
    return next();
  },
  deleteByIdMiddleware(AccessLevel),
);

export default router;
