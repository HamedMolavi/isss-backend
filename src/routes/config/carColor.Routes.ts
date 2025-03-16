import { Router, Request, Response, NextFunction } from "express";
import CarColor from "../../db/mongo/models/carColor";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateCarColorBody } from "../../validation/dto/carColor.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";

//create router for add to server file 
const router: Router = Router();

//add route for register new car_color
router.post(
    "",
    dtoValidationMiddleware(CreateCarColorBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    existCheck(CarColor, { name: "name", }, "Color already exists!"),
    createMiddleware(["name"], CarColor)
);

//route for get car_color list  
router.get("",
  readMiddleware(CarColor, (search) => { return { name: { $regex: search, $options: "i" } } })
);

//route for get car_color by id from DB 
router.get("/:id",
  readByIdMiddleware(CarColor)
);

router.delete("/:id",
  deleteByIdMiddleware(CarColor)
);

export default router;