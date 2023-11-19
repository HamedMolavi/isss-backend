import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import CarBrand from "../../db/mongo/models/carBrand";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateCarBrandBody } from "../../validation/dto/carBrand.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
//create router for add to server file 
const router: Router = Router();

//add route for register new car_brand
router.post(
    "",
    dtoValidationMiddleware(CreateCarBrandBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
    existCheck(CarBrand, { name: "name", }, "Brand already exists!"),
    createMiddleware(["name"], CarBrand)
);

//route for get car list  
router.get("",
    readMiddleware(CarBrand, (search) => { return { name: { $regex: search, $options: "i" } } })
);

//route for get car_brand by id from DB 
router.get("/:id",
  readByIdMiddleware(CarBrand)
);


//add route for delete car_brand by id from DB
router.delete("/:id",
  deleteByIdMiddleware(CarBrand)
);

export default router;