import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import Camera from "../../db/mongo/models/camera";
import Departement from "../../db/mongo/models/department";
import Section from "../../db/mongo/models/section";
import { IChildrenCamera, IChildrenSection, IResponseJson } from "../../types/interfaces/department.interface";
import { IDepartment } from "../../types/interfaces/department.interface";
import { ICamera } from "../../types/interfaces/camera.interface";
import { ISection } from "../../types/interfaces/section.interface";


//create router for add to server file
const router: Router = Router();

//route for get departementfile list
router.get(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //query for get departements list
      let departments: IDepartment[] = await Departement.find({}).exec();
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
            sections[j].department_id!.toString() ==
            departments[i]._id!.toString()
          ) {
            let childrenCamera: IChildrenCamera[] = [];
            for (let k = 0; k < cameras.length; k++) {
              if (
                cameras[k].section_id!.toString() == sections[j]._id!.toString()
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
                  damaged: cameras[k].damaged
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
