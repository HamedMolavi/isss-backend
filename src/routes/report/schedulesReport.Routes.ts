import { Router, Request, Response, NextFunction } from "express";
import mongoose, { Schema } from "mongoose";
import { ApiError } from "../../error/error.handler";
import Camera, { ICamera } from "../../models/camera";
import Departement, { IDepartment } from "../../models/department";
import { IModel } from "../../models/model";
import Model from "../../models/model";
import Section, { ISection } from "../../models/section";
import { getTokenAndVerify } from "../../tools/authentication";
import Schedule, { ISchedule } from "../../models/schedule";
import ModelToCamera, { IModelToCamera } from "../../models/modelToCamera";

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
  _id: mongoose.Types.ObjectId;
  type: string;
  name: string;
  category: string;
  uri: string;
  children: IChildrenSchedule[];
}

interface IChildrenSchedule {
  _id: mongoose.Types.ObjectId;
  type: string;
  start_cron: string;
  stop_cron: string;
  model_camera_id: mongoose.Types.ObjectId;
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
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
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
              childrenSchedule.push({
                _id: schedules[k]._id,
                type: "schedule",
                start_cron: schedules[k].start_cron,
                stop_cron: schedules[k].stop_cron,
                model_camera_id: schedules[k].model_camera_id,
                config: {
                  threshold: schedules[k].config.threshold,
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
                uri: models[p].uri,
                children: childrenSchedule,
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
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
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
              if (schedules[k].model_camera_id!.toString() == modelToCamera[j]._id!.toString()) {
                childrenSchedule.push({
                  _id: schedules[k]._id,
                  type: "schedule",
                  start_cron: schedules[k].start_cron,
                  stop_cron: schedules[k].stop_cron,
                  model_camera_id: schedules[k].model_camera_id,
                  config: {
                    threshold: schedules[k].config.threshold,
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
                  uri: models[p].uri,
                  children: childrenSchedule,
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
