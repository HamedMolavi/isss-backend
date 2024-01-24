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
import { DoNotAllowOnDefault } from "../../tools/request.tools";
import { authHexToObject, objectToAuthHex } from "../../tools/utils.tools";
import { accessList } from "../../types/interfaces/accessLevel.interface";

//create router for add to routes file
const router: Router = Router();

//add route for register new AccessLevel
router.post("",
  dtoValidationMiddleware(CreateAccessLevelBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(AccessLevel, { $and: [{ name: "name" }] }, "AccessLevel already exists!"),
  createMiddleware(["name",
    ...accessList.map(
      (key) => ({ [key]: (body: any) => objectToAuthHex(body[key]) })
    )], AccessLevel)
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
  DoNotAllowOnDefault(AccessLevel, { name: "admin" }),
  updateByIdMiddleware(AccessLevel, {
    update: accessList.reduce((result, key) => {
      result = { ...result, [key]: { name: key, fn: (payload: any) => objectToAuthHex(payload[key]) } }
      return result;
    }, {})
  }),
);

//add route for delete personnel
router.delete("/:id",
  DoNotAllowOnDefault(AccessLevel, { name: "admin" }),
  deleteByIdMiddleware(AccessLevel),
);

export default router;
