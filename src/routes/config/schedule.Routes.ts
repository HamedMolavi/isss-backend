import { Router, Request, Response, NextFunction } from "express";
import { IGetParams } from "../../types/interfaces/schedule.interface";
import Schedule from "../../db/mongo/models/schedule";
import Time from "../../tools/time.tools";
import ModelToCamera from "../../db/mongo/models/modelToCamera";
import { ApiError } from "../../types/classes/error.class";
import { ISchedule } from "../../types/interfaces/schedule.interface";
import { Clock, CronDay, DayOfWeek } from "../../types/interfaces/time.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreateScheduleBody } from "../../validation/dto/schedule.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readMiddleware } from "../../db/mongo/read.database";

//create router for add to server file
const router: Router = Router();

//add route for register new schedule
router.post("",
  // dtoValidationMiddleware(CreateScheduleBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  // existCheck(Schedule, {$and: [{ model_id: "model_id" }, { camera_id: "camera_id" }],}, "Schedule already exists!"), // TODO: this is not correct
  // createMiddleware([], Schedule),
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get json from body request
      const {
        start,
        stop,
        dayOfWeek,
        camera_id,
        model_id,
        montionDetection,
        threshold,
        zones,
        min_people,
        max_people,
        timeDuplicationDiagnoses,
      } = req.body;
      //verify body request
      if (!start || !stop || !dayOfWeek || !camera_id || !model_id) {
        req.flash("error", "Please fill all fields");
        return next(new ApiError(400, "Please fill all fields"));
      }
      //check for valid time
      if (!Time.compareTime(start, stop)) {
        req.flash("error", "Invalid time");
        return next(new ApiError(400, "Invalid time"));
      }
      //search for model in DB
      let model2Camera = await ModelToCamera.findOne({ $and: [{ model_id: model_id }, { camera_id: camera_id }], }).exec();
      // let model2Camera = await ModelToCamera.findOneAndUpdate(
      //   {
      //     $and: [{ model_id: model_id }, { camera_id: camera_id }],
      //   },
      //   { is_enabled: true },
      //   { new: true }
      // ).exec();

      //convert input time to cron format
      let start_cron = Time.toCronDay(Time.toCron(start), dayOfWeek.toString());
      let stop_cron = Time.toCronDay(Time.toCron(stop), dayOfWeek.toString());

      //fil new schedule
      let schedule = new Schedule({
        start_cron: start_cron,
        stop_cron: stop_cron,
        model_camera_id: model2Camera?._id,
        montionDetection: montionDetection,
        config: {
          timeDuplicationDiagnoses: timeDuplicationDiagnoses ?? 0,
          threshold: threshold != undefined ? threshold / 100 : 0,
          zones: zones && zones.length != 0 ? zones : [[0, 0, 1, 1]],
          min_people: min_people ?? 0,
          max_people: max_people ?? 0,
        },
      });

      //save schedule in DB
      await schedule.save();

      //return success
      req.flash("info", "schedule added");
      return res.status(201).json({
        success: true,
        data: {
          _id: schedule._id,
          start_cron: {
            min: schedule.start_cron.split(" ")[0],
            hour: schedule.start_cron.split(" ")[1],
            dow: schedule.start_cron.split(" ")[4].split(",") ?? ["*"],
          },
          stop_cron: {
            min: schedule.stop_cron.split(" ")[0],
            hour: schedule.stop_cron.split(" ")[1],
            dow: schedule.stop_cron.split(" ")[4].split(",") ?? ["*"],
          },
          model_camera_id: schedule.model_camera_id,
          config: {
            timeDuplicationDiagnoses:
              schedule.config.timeDuplicationDiagnoses ?? 0,
            threshold:
              schedule.config?.threshold != 0
                ? schedule.config?.threshold * 100
                : 0,
            zones: schedule.config.zones ?? null,
            min_people: schedule.config.min_people ?? 0,
            max_people: schedule.config.max_people ?? 0,
          },
        },
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
);

router.get(
  "",
  readMiddleware(Schedule, undefined, { populate: true })
);

//route for get schedule by id from DB
router.get(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "Schedule id is required");
        return next(new ApiError(400, "Schedule id is required"));
      }

      //query for get schedule by id from DB
      let schedule = await Schedule.findById(id).exec();

      //return response not found to client if not found schedule
      if (!schedule) {
        req.flash("error", "schedule not found");
        return next(new ApiError(404, "schedule not found"));
      }

      //return response to client with schedule
      return res.status(200).json({
        message: "Success",
        schedule: {
          _id: schedule._id,
          start_cron: {
            min: schedule.start_cron.split(" ")[0],
            hour: schedule.start_cron.split(" ")[1],
            dow: schedule.start_cron.split(" ")[4].split(",") ?? ["*"],
          },
          stop_cron: {
            min: schedule.stop_cron.split(" ")[0],
            hour: schedule.stop_cron.split(" ")[1],
            dow: schedule.stop_cron.split(" ")[4].split(",") ?? ["*"],
          },
          model_camera_id: schedule.model_camera_id,
          config: {
            timeDuplicationDiagnoses:
              schedule.config?.timeDuplicationDiagnoses ?? 0,
            threshold:
              schedule.config?.threshold != 0
                ? schedule.config?.threshold * 100
                : 0,
            zones: schedule.config.zones ?? null,
            min_people: schedule.config.min_people ?? 0,
            max_people: schedule.config.max_people ?? 0,
          },
        },
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
);

//add route for edit schedule
router.patch(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "schedule id is required");
        return next(new ApiError(400, "schedule id is required"));
      }
      //get body from request
      const scheduleBody: IGetParams = req.body;

      if (!scheduleBody.start && !scheduleBody.stop && scheduleBody.dayOfWeek) {
        req.flash("error", "start and stop is required");
        return next(new ApiError(400, "start and stop is required"));
      }

      if (scheduleBody.start && !scheduleBody.stop && !scheduleBody.dayOfWeek) {
        req.flash("error", "start and stop is required");
        return next(new ApiError(400, "start and stop is required"));
      }

      if (!scheduleBody.start && scheduleBody.stop && !scheduleBody.dayOfWeek) {
        req.flash("error", "start and stop is required");
        return next(new ApiError(400, "start and stop is required"));
      }
      let start_cron: CronDay | "" = "",
        stop_cron: CronDay | "" = "";
      if (scheduleBody.start && scheduleBody.stop) {
        //check for valid time
        if (!Time.compareTime(scheduleBody.start as Clock, scheduleBody.stop as Clock)) {
          req.flash("error", "Invalid time");
          return next(new ApiError(400, "Invalid time"));
        }

        //convert input time to cron format
        start_cron = Time.toCronDay(
          Time.toCron(scheduleBody.start as Clock),
          scheduleBody.dayOfWeek.toString() as DayOfWeek
        );
        stop_cron = Time.toCronDay(
          Time.toCron(scheduleBody.stop as Clock),
          scheduleBody.dayOfWeek.toString() as DayOfWeek
        );
      }

      let old_schedule = await Schedule.findById(id).exec();

      let update_schedule = {
        start_cron: start_cron != "" ? start_cron : old_schedule!.start_cron,
        stop_cron: stop_cron != "" ? stop_cron : old_schedule!.stop_cron,
        model_camera_id:
          scheduleBody.model_camera_id ?? old_schedule?.model_camera_id,
        config: {
          timeDuplicationDiagnoses:
            scheduleBody.timeDuplicationDiagnoses ??
            old_schedule?.config.timeDuplicationDiagnoses,
          threshold:
            scheduleBody?.threshold / 100 ?? old_schedule?.config?.threshold,
          zones:
            scheduleBody.zones.length > 0
              ? scheduleBody.zones
              : old_schedule?.config?.zones,
          min_people:
            scheduleBody.min_people ?? old_schedule?.config?.min_people,
          max_people:
            scheduleBody.max_people ?? old_schedule?.config?.max_people,
        },
      };

      //query for get schedule by id from DB and update
      let schedule = await Schedule.findByIdAndUpdate(id, update_schedule, {
        new: true,
      }).exec();

      //return response not found to client if not found schedule
      if (!schedule) {
        req.flash("error", "schedule not found");
        return next(new ApiError(404, "schedule not found"));
      }

      //return response to client with schedule
      return res.status(201).json({
        message: "Success",
        schedule: {
          _id: schedule._id,
          start_cron: {
            min: schedule.start_cron.split(" ")[0],
            hour: schedule.start_cron.split(" ")[1],
            dow: schedule.start_cron.split(" ")[4].split(",") ?? ["*"],
          },
          stop_cron: {
            min: schedule.stop_cron.split(" ")[0],
            hour: schedule.stop_cron.split(" ")[1],
            dow: schedule.stop_cron.split(" ")[4].split(",") ?? ["*"],
          },
          model_camera_id: schedule.model_camera_id,
          config: {
            timeDuplicationDiagnoses:
              schedule.config.timeDuplicationDiagnoses ?? 0,
            threshold:
              schedule.config?.threshold != 0
                ? schedule.config?.threshold * 100
                : 0,
            zones: schedule.config.zones ?? null,
            min_people: schedule.config.min_people ?? 0,
            max_people: schedule.config.max_people ?? 0,
          },
        },
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
);

//add route for delete schedule
router.delete("/:id",
  async function (req: any, res: any, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "schedule id is required");
        return next(new ApiError(400, "schedule id is required"));
      }

      //query for get schedule by id from DB
      let schedule = await Schedule.findByIdAndDelete(id).exec();
      //return response not found to client if not found schedule
      if (!schedule) {
        req.flash("error", "schedule not found");
        return next(new ApiError(404, "schedule not found"));
      }

      // let model2Camera = await ModelToCamera.findByIdAndUpdate(
      //   schedule.model_camera_id,
      //   { is_enabled: false },
      //   { new: true }
      // ).exec();

      // let model2Camera = await ModelToCamera.findOneAndDelete({sche})
      //return response to client with schedule
      return res.status(201).json({
        message: "Success",
        schedule: schedule,
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  });

export default router;
