import { Router, Request, Response, NextFunction } from "express";
import mongoose, { Schema } from "mongoose";
import { ApiError } from "../../../error/error.handler";
import Camera, { ICamera } from "../../../models/camera";
import Departement, { IDepartement } from "../../../models/departement";
import Section, { ISection } from "../../../models/section";
import { getTokenAndVerify } from "../../../tools/authentication";

interface IChildrenCamera {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  url: string;
  username: string;
  password: string;
  ip: string;
  is_enabled: boolean;
}

interface IChildrenSection {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  children: IChildrenCamera[];
}

interface IResponseJson {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  children: IChildrenSection[];
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
router.get(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get page from url
      // let strPage = req.query.page as string;
      // let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      // //get perPage from url
      // let strPerPage = req.query.perPage as string;
      // let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

      //get token from header request and verify
      let token = getTokenAndVerify(req, "user", next);
      //query for get departements list
      let departments: IDepartement[] = await Departement.find({}).exec();

      //query for get all section from DB
      let sections: ISection[] = await Section.find({}).exec();

      //query for get all camera from DB
      let cameras: ICamera[] = await Camera.find({}).exec();
      //return response not found to client if not found departements
      if (!departments) {
        req.flash("error", "Departement not found");
        return next(new ApiError(404, "Departement not found"));
      }
      let response: IResponseJson[] = [];
      //loop for get sort departments and section in json response
      for (let i = 0; i < departments.length; i++) {
        let childrenSection: IChildrenSection[] = [];
        for (let j = 0; j < sections.length; j++) {
          if (
            sections[j].departement_id.toString() ==
            departments[i]._id.toString()
          ) {
            let childrenCamera: IChildrenCamera[] = [];
            for (let k = 0; k < cameras.length; k++) {
              if (
                cameras[k].section_id.toString() == sections[j]._id.toString()
              ) {
                childrenCamera.push({
                  _id: cameras[k]._id,
                  name: cameras[k].name,
                  type: "camera",
                  url: cameras[k].url,
                  username: cameras[k].username,
                  password: cameras[k].password,
                  ip: cameras[k].ip,
                  is_enabled: cameras[k].is_enabled,
                });
              }
            }
            childrenSection.push({
              _id: sections[j]._id,
              name: sections[j].name,
              type: "section",
              children: childrenCamera,
            });
          }

          //sort section by name
          childrenSection.sort((a, b) => {
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
          _id: departments[i]._id,
          name: departments[i].name,
          type: "department",
          children: childrenSection,
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
        // page: page,
        // perPage: perPage,
        total: await Departement.countDocuments().exec(),
       // pages: Math.ceil((await Departement.countDocuments().exec()) / perPage),
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  }
);

export default router;
