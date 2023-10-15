import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import Departement from "../../db/mongo/models/department";
import { IDepartment } from "../../types/interfaces/department.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateDepartmentBody } from "../../validation/dto/department.dto";
import { existCheck } from "../../validation/db";
import Department from "../../db/mongo/models/department";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";

//create router for add to server file
const router: Router = Router();

//add route for register new departement
router.post("",
  dtoValidationMiddleware(CreateDepartmentBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"]==="development" ? true : false, info: "please fill all fields" }),
  existCheck(Department, { $and: [{ name: "name" }], }, "Department already exists!"),
  createMiddleware(["name", "created_date"], Department),
);

//route for get departements list
router.get("",
  readMiddleware(Department, (search) => { return { name: { $regex: search, $options: "i" } } }),
);

//route for get departement by id from DB
router.get("/:id",
  readByIdMiddleware(Departement),
);

//add route for edit departement
router.patch("/:id", // TODO: dto needed
  updateByIdMiddleware(Departement)
);

//add route for delete departement
router.delete("/:id",
  deleteByIdMiddleware(Departement)
);

export default router;
