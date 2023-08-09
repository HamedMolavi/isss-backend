import { Router, Request, Response, NextFunction } from "express";
import mongoose, { Schema } from "mongoose";
import { ApiError } from "../../types/classes/error.class";
import Camera from "../../db/mongo/models/camera";
import Departement from "../../db/mongo/models/department";
import Model from "../../db/mongo/models/model";
import Schedule from "../../db/mongo/models/schedule";
import ModelToCamera from "../../db/mongo/models/modelToCamera";
import { ICamera } from "../../types/interfaces/camera.interface";
import { IModel } from "../../types/interfaces/model.interface";
import { ISchedule } from "../../types/interfaces/schedule.interface";
import { IModelToCamera } from "../../types/interfaces/modelToCamera.interface";

//get user role from enviroment variable
const const_role = process.env.const_role || "user";

interface IResponseJson {
  _id: mongoose.Types.ObjectId;
  section_id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  url: string;
  username: string;
  password: string;
  ip: string;
  is_enabled: boolean;
  children: IChildrenModel[];
}

interface IChildrenModel {
  _id: Schema.Types.ObjectId;
  type: string;
  name: string;
  category: string;
  is_enabled: boolean;
  uri: string;
  children: IChildrenSchedule[];
}

interface IChildrenSchedule {
  _id: Schema.Types.ObjectId;
  type: string;
  start_cron: any;
  stop_cron: any;
  model_camera_id: Schema.Types.ObjectId;
  config: {
    threshold: number;
    zones: [number[]];
    min_people: number;
    max_people: number;
  };
}

//create router for add to server file
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

//route for get departementfile list
router.get("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }
    //query for get departements list
    let models: IModel[] = await Model.find({}).exec();
    //query for get all section from DB
    let schedules: ISchedule[] = await Schedule.find({}).exec();
    //query for get all camera from DB
    let cameras: ICamera[] = await Camera.find({}).exec();
    //query for get all camera from DB
    let modelToCamera: IModelToCamera[] = await ModelToCamera.find({}).exec();
    //return response not found to client if not found departements
    if (!modelToCamera) {
      req.flash("error", "modelToCamera not found");
      return next(new ApiError(404, "ModelToCamera not found"));
    }
    let response: IResponseJson[] = [];
    //loop for get sort departments and section in json response
    for (let i = 0; i < cameras.length; i++) {
      let childrenModel: IChildrenModel[] = [];
      for (let j = 0; j < modelToCamera.length; j++) {
        let childrenSchedule: IChildrenSchedule[] = [];
        if (cameras[i]._id!.toString() == modelToCamera[j].camera_id!.toString()) {
          for (let k = 0; k < schedules.length; k++) {
            if (schedules[k].model_camera_id!.toString() == modelToCamera[j]._id!.toString()) {
              let time_start_json = schedules[k].start_cron.split(" ");
              let time_stop_json = schedules[k].stop_cron.split(" ");
              childrenSchedule.push({
                _id: schedules[k]._id,
                type: "schedule",
                start_cron: {
                  min: time_start_json[0],
                  hour: time_start_json[1],
                  dow: time_start_json[4].split(",") ?? ["*"],
                },
                stop_cron: {
                  min: time_stop_json[0],
                  hour: time_stop_json[1],
                  dow: time_stop_json[4].split(",") ?? ["*"],
                },
                model_camera_id: schedules[k].model_camera_id,
                config: {
                  threshold: schedules[k].config.threshold > 0 ? schedules[k].config.threshold * 100 : schedules[k].config.threshold,
                  zones: schedules[k].config.zones,
                  min_people: schedules[k].config.min_people,
                  max_people: schedules[k].config.max_people,
                },
              });
            }
          }
          for (let p = 0; p < models.length; ++p) {
            if (models[p]._id!.toString() == modelToCamera[j].model_id!.toString() && modelToCamera[j].is_enabled == true) {
              childrenModel.push({
                _id: models[p]._id,
                name: models[p].name,
                type: "model",
                category: models[p].category,
                is_enabled: modelToCamera[j].is_enabled,
                uri: models[p].uri,
                children: childrenSchedule.length > 0 ? childrenSchedule : [],
              });
            }
          }
        }

        //sort section by name
        childrenModel.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
      }
      response.push({
        _id: cameras[i]._id,
        type: "camera",
        name: cameras[i].name,
        children: childrenModel,
        section_id: cameras[i].section_id,
        url: cameras[i].url,
        username: cameras[i].username,
        password: cameras[i].password,
        ip: cameras[i].ip,
        is_enabled: cameras[i].is_enabled,
      });
    }
    //sort departement by name
    response.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

    //return response to client with departements file list
    return res.status(200).json({
      success: true,
      data: response,
      total: await Departement.countDocuments().exec(),
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//route for get departementfile list
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    let id = req.params.id;
    //get token from header request and verify
   // let token = getTokenAndVerify(req, const_role, next);
   // if (!token) {
   //   return null;
   // }
    // var cronInstance = new cronConverter();
    // cronInstance.fromString("*/5 * * * *");
    // // Get the iterator, initialised to now
    // var schedule = cronInstance.schedule();

    //query for get departements list
    let models: IModel[] = await Model.find({}).exec();
    //query for get all section from DB
    let schedules: ISchedule[] = await Schedule.find({}).exec();
    //query for get all camera from DB
    let cameras: ICamera[] = await Camera.find({}).exec();
    //query for get all camera from DB
    let modelToCamera: IModelToCamera[] = await ModelToCamera.find({}).exec();
    //return response not found to client if not found departements
    if (!modelToCamera) {
      req.flash("error", "modelToCamera not found");
      return next(new ApiError(404, "ModelToCamera not found"));
    }
    let response: IResponseJson[] = [];
    //loop for get sort departments and section in json response
    for (let i = 0; i < cameras.length; i++) {
      let childrenModel: IChildrenModel[] = [];
      if (cameras[i]._id!.toString() === id) {
        for (let j = 0; j < modelToCamera.length; j++) {
          let childrenSchedule: IChildrenSchedule[] = [];
          if (cameras[i]._id!.toString() == modelToCamera[j].camera_id!.toString()) {
            for (let k = 0; k < schedules.length; k++) {
              let time_start_json = schedules[k].start_cron.split(" ");
              let time_stop_json = schedules[k].stop_cron.split(" ");
              if (schedules[k].model_camera_id!.toString() == modelToCamera[j]._id!.toString()) {
                childrenSchedule.push({
                  _id: schedules[k]._id,
                  type: "schedule",
                  start_cron: {
                    min: time_start_json[0],
                    hour: time_start_json[1],
                    dow: time_start_json[4].split(",") ?? ["*"],
                  },
                  stop_cron: {
                    min: time_stop_json[0],
                    hour: time_stop_json[1],
                    dow: time_stop_json[4].split(",") ?? ["*"],
                  },
                  model_camera_id: schedules[k].model_camera_id,
                  config: {
                    threshold: schedules[k].config.threshold > 0 ? schedules[k].config.threshold * 100 : schedules[k].config.threshold,
                    zones: schedules[k].config.zones,
                    min_people: schedules[k].config.min_people,
                    max_people: schedules[k].config.max_people,
                  },
                });
              }
            }
            for (let p = 0; p < models.length; ++p) {
              if (models[p]._id!.toString() == modelToCamera[j].model_id!.toString()) {
                childrenModel.push({
                  _id: models[p]._id,
                  name: models[p].name,
                  type: "model",
                  category: models[p].category,
                  is_enabled: modelToCamera[j].is_enabled,
                  uri: models[p].uri,
                  children: childrenSchedule.length > 0 ? childrenSchedule : [],
                });
              }
            }
          }

          //sort section by name
          childrenModel.sort((a, b) => {
            if (a.name < b.name) {
              return -1;
            }
            if (a.name > b.name) {
              return 1;
            }
            return 0;
          });
        }
        response.push({
          _id: cameras[i]._id,
          type: "camera",
          name: cameras[i].name,
          children: childrenModel,
          section_id: cameras[i].section_id,
          url: cameras[i].url,
          username: cameras[i].username,
          password: cameras[i].password,
          ip: cameras[i].ip,
          is_enabled: cameras[i].is_enabled,
        });
        //sort departement by name
        response.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
      }
    }

    //return response to client with departements file list
    return res.status(200).json({
      success: true,
      data: response,
      total: await Departement.countDocuments().exec(),
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

export default router;
