import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import JobTitle from "../../db/mongo/models/jobTitle";
import { IJobTitle } from "../../types/interfaces/jobTitle.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateJobTitleBody } from "../../validation/dto/jobTitle.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";

//create router for add to server file
const router: Router = Router();


//add route for register new jobTitle
router.post("",
dtoValidationMiddleware(CreateJobTitleBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"]==="development" ? true : false, info: "please fill all fields" }),
existCheck(JobTitle, { $and: [{ name: "name" }], }, "JobTitle already exists!"),
createMiddleware(["name"], JobTitle)
);

//route for get jobTitle list
router.get("",
  readMiddleware(JobTitle, (search) => { return { name: { $regex: search, $options: "i" } } })
);

//route for get jobTitle by id from DB
router.get("/:id",
  readByIdMiddleware(JobTitle),
);

//add route for edit jobTitle
router.patch("/:id",
  updateByIdMiddleware(JobTitle)
);

//add route for delete jobTitle
router.delete("/:id",
  deleteByIdMiddleware(JobTitle)
);

export default router;
