import { Router } from "express";
import Schedule from "../../db/mongo/models/schedule";
import Time from "../../tools/time.tools";
import ModelToCamera from "../../db/mongo/models/modelToCamera";
import { Clock, DayOfWeek } from "../../types/interfaces/time.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateScheduleBody, UpdateActiveScheduleBody, UpdateScheduleBody } from "../../validation/dto/schedule.dto";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { injectDataMiddleware } from "../../tools/request.tools";
import { updateByIdMiddleware, updateByListMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";

//create router for add to server file
const router: Router = Router();

//add route for register new schedule
router.post("",
  dtoValidationMiddleware(CreateScheduleBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
  injectDataMiddleware(async (body: any) => {
    return (await ModelToCamera.findOne({ "model_id": body.model_id, "camera_id": body.camera_id }).exec())?._id;
  }, { injData: "model_camera_id" }),
  readMiddleware(Schedule, (search: string) => { return { "model_camera_id": search } }, { next: true, save: "schedules", searchFromBody: (body) => body.model_camera_id._id }), //save schedule documents in req.body.schedules and hit next
  Time.validateTimeMiddleware("start", "stop", "dayOfWeek", "schedules"),
  injectDataMiddleware(convertPlaiBodyToSchedule, { spread: true }),
  createMiddleware(["start_cron", "stop_cron", "montionDetection", "config", "model_camera_id", "description", "users_alert", "sms", "alert","justHuman"], Schedule),
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

router.patch("/activeschedule",
  dtoValidationMiddleware(UpdateActiveScheduleBody, { detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  updateByListMiddleware(Schedule, { next: false, update: { sms: { name: "sms.active" }, alert: { name: "alert.active" } } }));

//add route for edit schedule
router.patch(
  "/:id",
  dtoValidationMiddleware(UpdateScheduleBody, { detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  Time.compareTimeMiddleware("start", "stop"),
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
      "zones": { name: "config.zones" },
      "timeDuplicationDiagnoses": { name: "config.timeDuplicationDiagnoses" },
      "threshold": { name: "config.threshold" },
      "min_people": { name: "config.min_people" },
      "max_people": { name: "config.max_people" },
      "montionDetection": { name: "config.montionDetection" },
      "justHuman": { name: "config.justHuman" },
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
  const {
    start,
    stop,
    dayOfWeek,
    montionDetection,
    threshold,
    zones,
    min_people,
    max_people,
    timeDuplicationDiagnoses,
  } = body;
  //convert input time to cron format
  let start_cron = Time.toCronDay(Time.toCron(start), dayOfWeek.toString());
  let stop_cron = Time.toCronDay(Time.toCron(stop), dayOfWeek.toString());

  return {
    start_cron: start_cron,
    stop_cron: stop_cron,
    montionDetection: montionDetection,
    config: {
      timeDuplicationDiagnoses: timeDuplicationDiagnoses ?? 0,
      threshold: threshold != undefined ? threshold / 100 : 0,
      zones: zones && zones.length != 0 ? zones : [[0, 0], [1, 0], [1, 1], [0, 1]],
      min_people: min_people ?? 0,
      max_people: max_people ?? 0,
    },
  };
}

export default router;
