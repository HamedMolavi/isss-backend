import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import CarBrand from "../../db/mongo/models/carBrand";
import CarColor from "../../db/mongo/models/carColor";
import Personnel from "../../db/mongo/models/personnel";
import { persianPlateDict, englishPlateDict } from "../../tools/plate.tools";
import Car from "../../db/mongo/models/car";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateCarBody } from "../../validation/dto/car.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { ICar } from "../../types/interfaces/car.interface";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import { carSendFunction, stringifyPlate } from "../../tools/car.tools";

//create router for add to routes file
const router: Router = Router();

//add route for register new car
router.post("",
  dtoValidationMiddleware(CreateCarBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  // TODO: validate plateObj.second is defined in englishPlateDict
  existCheck(Car, (body: { [key: string]: any }) => { return { number_plate: stringifyPlate(body) } }, "Car already exists!"),
  createMiddleware(["owner", { "number_plate": (body: { [key: string]: any }) => stringifyPlate(body) }, "brand", "color", "camera_whitelist", "schedule_whitelist", "section_whitelist", "department_whitelist", "tracked"], Car, {
    send: carSendFunction
  }),
);

//route for get car list
router.get("",
  readMiddleware(Car, (search) => { return { number_plate: { $regex: search, $options: "i" } } }, { populate: true, send: carSendFunction })
);

//route for get car by id from DB
router.get("/:id",
  readByIdMiddleware(Car, { send: carSendFunction, populate: true }),
);

//add route for edit car
router.patch("/:id",
  updateByIdMiddleware(Car, { update: { "number_plate": stringifyPlate }, send: carSendFunction }),
);

//add route for delete car
router.delete("/:id",
  deleteByIdMiddleware(Car, { send: carSendFunction }),
);

export default router;


