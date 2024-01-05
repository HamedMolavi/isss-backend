import { Router, Request, Response, NextFunction } from "express";
import { IGetParams, IOperation } from "../../types/interfaces/schedule.interface";
import Schedule from "../../db/mongo/models/schedule";
import Time from "../../tools/time.tools";
import ModelToCamera from "../../db/mongo/models/modelToCamera";
import { ApiError } from "../../types/classes/error.class";
import { ISchedule } from "../../types/interfaces/schedule.interface";
import { Clock, CronDay, DayOfWeek } from "../../types/interfaces/time.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateScheduleBody, UpdateScheduleBody } from "../../validation/dto/schedule.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { read, readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import mongoose, { Schema } from "mongoose";
import { injectDataMiddleware } from "../../tools/request.tools";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";

//create router for add to server file
const router: Router = Router();

//add route for register new schedule
router.post("",
  dtoValidationMiddleware(CreateScheduleBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  injectDataMiddleware(async (body: any) => {
    return (await ModelToCamera.findOne({ "model_id": body.model_id, "camera_id": body.camera_id }).exec())?.id;
  }, { injData: "model_camera_id" }),
  readMiddleware(Schedule, (search: string) => { return { "model_camera_id": new mongoose.Types.ObjectId(search) } }, { next: true, save: "schedules", searchFromBody: (body) => body.model_camera_id }), //save schedule documents in req.body.schedules and hit next
  Time.validateTimeMiddleware("start", "stop", "dayOfWeek", "schedules"),
  injectDataMiddleware(convertPlaiBodyToSchedule, { spread: true }),
  createMiddleware(["start_cron", "stop_cron", "operations", "model_camera_id"], Schedule),
);

router.get(
  "",
  readMiddleware(Schedule, undefined, { populate: true })
);

//route for get schedule by id from DB
router.get(
  "/:id",
  readByIdMiddleware(Schedule, { populate: true }),
);

//add route for edit schedule
router.patch(
  "/:id",
  dtoValidationMiddleware(UpdateScheduleBody, { detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  injectDataMiddleware(async (body: any) => {
    return (await ModelToCamera.findOne({ "model_id": body.model_id, "camera_id": body.camera_id }).exec())?._id;
  }, { injData: "model_camera_id" }),
  readMiddleware(Schedule, (search: string) => { return { "model_camera_id": search } }, { next: true, save: "schedules", searchFromBody: (body) => body.model_camera_id._id }), //save schedule documents in req.body.schedules and hit next
  Time.validateTimeMiddleware("start", "stop", "dayOfWeek", "schedules"),
  updateByIdMiddleware(Schedule, {
    update: {
      "start": {
        name: "start_cron",
        fn: (payload) => Time.toCronDay(Time.toCron(payload.start as Clock), payload.dayOfWeek.toString() as DayOfWeek)
      },
      "stop": {
        name: "stop_cron",
        fn: (payload) => Time.toCronDay(Time.toCron(payload.stop as Clock), payload.dayOfWeek.toString() as DayOfWeek)
      },
      "operation":{
        name: "operation",
        fn(payload) {
            
        },
      },
      "zones": { name: "config.zones" },
      "timeDuplicationDiagnoses": { name: "config.timeDuplicationDiagnoses" },
      "threshold": { name: "config.threshold" },
      "min_people": { name: "config.min_people" },
      "max_people": { name: "config.max_people" },
      "model_id": {
        name: "model_camera_id",
        fn: async (payload) => (await ModelToCamera.findOne({ "model_id": payload.model_id, "camera_id": payload.camera_id }).exec())?._id
      }
    },
    ignore: ["dayOfWeek", "camera_id", "is_running"],
  })
);

//add route for delete schedule
router.delete("/:id",
  deleteByIdMiddleware(Schedule)
);


function convertPlaiBodyToSchedule(body: any) {
  let {
    start,
    stop,
    dayOfWeek,
    operations
  } = body;
  operations = operations.map((operation: IOperation) => { // fill all required fields except "logs"
    return {
      timeDuplicationDiagnoses: operation?.timeDuplicationDiagnoses ?? 0,
      threshold: operation?.threshold != undefined ? operation?.threshold / 100 : 0,
      zone: !!operation?.zone ? operation?.zone : [0, 0, 1, 1],
      min_people: operation?.min_people ?? 0,
      max_people: operation?.max_people ?? 0,
      logs: operation.logs,
    }
  })
  //convert input time to cron format
  let start_cron = Time.toCronDay(Time.toCron(start), dayOfWeek.toString());
  let stop_cron = Time.toCronDay(Time.toCron(stop), dayOfWeek.toString());
  return {
    start_cron,
    stop_cron,
    operations
  };
}

export default router;

