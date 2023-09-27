import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import Section from "../../db/mongo/models/section";
import { ISection } from "../../types/interfaces/section.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateSectionBody } from "../../validation/dto/section.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateById } from "../../db/mongo/update.database";
import { deleteById } from "../../db/mongo/delete.database";

//create router for add to routes file
const router: Router = Router();

//add route for register new section
router.post("",
  dtoValidationMiddleware(CreateSectionBody, { skipMissingProperties: false, detailedMassage: false, info: "please fill all fields" }),
  existCheck(Section, { $and: [{ name: "name" }, { department_id: "department_id" }] }, "Camera already exists!"),
  createMiddleware(["name", "department_id"], Section),
);

//route for get sections list
router.get("",
  readMiddleware(Section, (search) => { return { ip: { $regex: search, $options: "i" } } })
);

//route for get section by id from DB
router.get("/:id",
  readByIdMiddleware(Section)
);

//add route for edit section
router.patch("/:id",
  updateById(Section),
);

//add route for delete section
router.delete("/:id",
  deleteById(Section),
);

export default router;
