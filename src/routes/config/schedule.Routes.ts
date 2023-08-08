import { Router, Request, Response, NextFunction } from "express";
import { IGetParams } from "../../interfaces/temp.interface";
import Schedule, { ISchedule } from "../../db/mongo/models/schedule";
import {
  compareTime,
  convertToCron,
  convertToCronDay,
} from "./../../tools/convertTime";
import ModelToCamera from "../../db/mongo/models/modelToCamera";
import { ApiError } from "../../error/error.handler";

//create router for add to server file
const router: Router = Router();

//add route for register new schedule
router.post(
  "",
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
      if (!compareTime(start, stop)) {
        req.flash("error", "Invalid time");
        return next(new ApiError(400, "Invalid time"));
      }
      //search for model in DB
      let model2Camera = await ModelToCamera.findOne({
        $and: [{ model_id: model_id }, { camera_id: camera_id }],
      }).exec();
      // let model2Camera = await ModelToCamera.findOneAndUpdate(
      //   {
      //     $and: [{ model_id: model_id }, { camera_id: camera_id }],
      //   },
      //   { is_enabled: true },
      //   { new: true }
      // ).exec();

      //convert input time to cron format
      let start_cron: string = convertToCron(start);
      start_cron = convertToCronDay(start_cron, dayOfWeek.toString());
      let stop_cron: string = convertToCron(stop);
      stop_cron = convertToCronDay(stop_cron, dayOfWeek.toString());

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

//route for get schedule list
router.get(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      //get perPage from url
      let strPerPage = req.query.PerPage as string;
      let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

      //query for get schedule from DB
      let schedules: ISchedule[] | null = await Schedule.find({})
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();

      let response_list = schedules.map((_schedule) => {
        let data = {
          _id: _schedule._id,
          start_cron: {
            min: _schedule.start_cron.split(" ")[0],
            hour: _schedule.start_cron.split(" ")[1],
            dow: _schedule.start_cron.split(" ")[4].split(",") ?? ["*"],
          },
          stop_cron: {
            min: _schedule.stop_cron.split(" ")[0],
            hour: _schedule.stop_cron.split(" ")[1],
            dow: _schedule.stop_cron.split(" ")[4].split(",") ?? ["*"],
          },
          model_camera_id: _schedule.model_camera_id,
          config: {
            timeDuplicationDiagnoses:
              _schedule.config.timeDuplicationDiagnoses ?? 0,
            threshold:
              _schedule.config?.threshold != 0
                ? _schedule.config?.threshold * 100
                : 0,
            zones: _schedule.config.zones ?? null,
            min_people: _schedule.config.min_people ?? 0,
            max_people: _schedule.config.max_people ?? 0,
          },
        };
        return data;
      });
      //return success
      req.flash("info", "schedule list");
      //send response to client with schedules
      return res.status(200).json({
        success: true,
        data: response_list,
        page: page,
        perPage: perPage,
        total: await Schedule.countDocuments().exec(),
        pages: Math.ceil((await Schedule.countDocuments().exec()) / perPage),
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
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
      let start_cron = "",
        stop_cron = "";
      if (scheduleBody.start && scheduleBody.stop) {
        //check for valid time
        if (!compareTime(scheduleBody.start, scheduleBody.stop)) {
          req.flash("error", "Invalid time");
          return next(new ApiError(400, "Invalid time"));
        }

        //convert input time to cron format
        start_cron = convertToCron(scheduleBody.start);
        start_cron = convertToCronDay(
          start_cron,
          scheduleBody.dayOfWeek.toString()
        );
        stop_cron = convertToCron(scheduleBody.stop);
        stop_cron = convertToCronDay(
          stop_cron,
          scheduleBody.dayOfWeek.toString()
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
