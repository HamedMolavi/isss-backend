import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import CarColor from "../../db/mongo/models/carColor";
import { ICarColor } from "../../types/interfaces/car.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { CreateCarColorBody } from "../../validation/dto/carColor.dto";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import Car from "../../db/mongo/models/car";
import mongoose from "mongoose";
import { carSendFunction } from "../../tools/car.tools";

//create router for add to server file 
const router: Router = Router();

//add route for register new car_color
// router.post(
//     "",
//     dtoValidationMiddleware(CreateCarColorBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
//     existCheck(CarColor, { name: "name", }, "Color already exists!"),
//     createMiddleware(["name"], CarColor)
// );

//route for get car_color list  
router.get("",
  readMiddleware(CarColor, (search) => { return { name: { $regex: search, $options: "i" } } })
);

//route for get car_color by id from DB 
router.get("/:id/cars",
  readMiddleware(Car, (search) => { return { color: new mongoose.Types.ObjectId(search) } }, { populate: true, searchFromParams: (params) => params.id, send: carSendFunction })
);

//route for get car_color by id from DB 
router.get("/:id",
  readByIdMiddleware(CarColor)
);

//add route for delete car_color by id from DB
// router.delete("/:id",
//   deleteByIdMiddleware(CarColor)
// );

export default router;