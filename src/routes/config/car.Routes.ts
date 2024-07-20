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
import { carSendFunction } from "../../tools/car.tools";
import { injectDataMiddleware } from "../../tools/request.tools";
import Time, { allowedPassConvert } from "../../tools/time.tools";

//create router for add to routes file
const router: Router = Router();

//add route for register new car
router.post("",
  dtoValidationMiddleware(CreateCarBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  // TODO: validate plateObj.second is defined in englishPlateDict
  existCheck(Car, { $and: [{ number_plate: "number_plate" }] }, "Car already exists!"),
  injectDataMiddleware(allowedPassConvert, { injData: "allowed_pass" }),
  createMiddleware(["owner", "plate_type", "number_plate", "brand", "color", "camera_whitelist", "schedule_whitelist", "section_whitelist", "department_whitelist", "tracked", "allowed_pass"], Car, {
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


