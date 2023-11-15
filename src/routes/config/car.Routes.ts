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

//create router for add to routes file
const router: Router = Router();

//add route for register new car
router.post("",
  dtoValidationMiddleware(CreateCarBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Car, (body: { [key: string]: any }) => { return { number_plate: stringifyPlate(body.number_plate) } }, "Car already exists!"),
  createMiddleware(["owner", { "number_plate": (body: { [key: string]: any }) => stringifyPlate(body.number_plate) }, "brand", "color", "camera_whitelist", "tracked"], Car, {
    send: sendFunction
  }),
);

//route for get car list
router.get("",//["brand", "owner", "color"]
  readMiddleware(Car, (search) => { return { number_plate: { $regex: search, $options: "i" } } }, { populate: true, send: sendFunction })
);

//route for get car by id from DB
router.get("/:id",
  readByIdMiddleware(Car, { send: sendFunction }),
);

//add route for edit car
router.patch("/:id",
  updateByIdMiddleware(Car, { update: { "number_plate": stringifyPlate }, send: sendFunction }),
);

//add route for delete car
router.delete("/:id",
  deleteByIdMiddleware(Car, { send: sendFunction }),
);

export default router;


function sendFunction(doc: ICar) {
  return {
    owner: doc.owner,
    number_plate: {
      first: Number(doc.number_plate.substr(0, 2)),
      second: persianPlateDict[doc.number_plate.substr(2, 1)],
      third: Number(doc.number_plate.substr(3, 3)),
      fourth: "ایران",
      fifth: Number(doc.number_plate.substr(6, 2)),
    },
    brand: doc.brand,
    color: doc.color,
    camera_whitelist: doc.camera_whitelist,
    _id: doc._id,
  }
};
function stringifyPlate(plateObj: { [key: string]: string }) {
  return `${plateObj.first}${englishPlateDict[plateObj.second]}${plateObj.third}${plateObj.fifth}`
};
