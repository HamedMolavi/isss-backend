import { Router, Request, Response, NextFunction } from "express";
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
import { injectDataMiddleware } from "../../tools/request.tools";
import Time, { allowedPassConvert } from "../../tools/time.tools";

//create router for add to routes file
const router: Router = Router();

//add route for register new car
router.post("",
  dtoValidationMiddleware(CreateCarBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  // TODO: validate plateObj.second is defined in englishPlateDict
  existCheck(Car, (body: { [key: string]: any }) => { return { number_plate: stringifyPlate(body) } }, "Car already exists!"),
  injectDataMiddleware(allowedPassConvert, { injData: "allowed_pass" }),
  createMiddleware(["owner", { "number_plate": (body: { [key: string]: any }) => stringifyPlate(body) }, "brand", "color", "camera_whitelist", "tracked", "allowed_pass"], Car, {
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
  updateByIdMiddleware(Car, {
    update: {
      "number_plate": stringifyPlate,
      "time_start": {
        name: "allowed_pass.start",
        fn: (payload) => (new Date(payload.date_start + " " + payload.time_start + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime()
      },
      "time_end": {
        name: "allowed_pass.end",
        fn: (payload) => (new Date(payload.date_end + " " + payload.time_end + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime()
      }
    }, send: carSendFunction
  }),
);

//add route for delete car
router.delete("/:id",
  deleteByIdMiddleware(Car, { send: carSendFunction }),
);

export default router;


