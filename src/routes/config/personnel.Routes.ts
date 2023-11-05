import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import { requestForGetPersonnel } from "../../db/elastic/connect.database";
import { ApiError } from "../../types/classes/error.class";
import Camera from "../../db/mongo/models/camera";
import url from "url";
import PersonImage from "../../db/mongo/models/personImage";
import { ImageFileSystem } from "../../tools/kafkaFile.tools";
import Personnel from "../../db/mongo/models/personnel";
import { IPersonnel } from "../../types/interfaces/personnel.interface";
import { dtoValidationMiddleware } from "../../validation/dto";
import { CreatePersonnelBody } from "../../validation/dto/personnel.dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";

const fs = new ImageFileSystem();
//create router for add to routes file
const router: Router = Router();


//add route for register new personnel
router.post("",
  dtoValidationMiddleware(CreatePersonnelBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Personnel, { $or: [{ national_code: "national_code" }, { personnel_code: "personnel_code" }] }, "Personnel already exists!"),
  createMiddleware(["first_name", "last_name", "national_code", "email", "phone_number", "job_id", "tracked", "personnel_code", "section_id", "camera_whitelist", "is_active", "is_employee", "is_dismissed"], Personnel, { next: true, save: "doc" }),
  fs.uploadAvatarMiddleware("avatar_str", ["doc", "_id"], {}, "doc"),
);

// //add route for delete jobTitle
// router.delete("/:id",
//   deleteById(JobTitle)
// );

// export default router;

//route for get personnels list
router.get("",
  readMiddleware(Personnel, (search) => { return { ip: { $regex: search, $options: "i" } } }, { next: true }),
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      let data: object[] = [];
      for (let _personnel of req.body["docs"]) {
        // data =personnels.map(async(person) => {
        let per = _personnel.toJSON();

        // TODO: fetch last location from normalizer server.
        let logPersonnel = await requestForGetPersonnel(_personnel._id.toString());

        let _camera;
        if (logPersonnel?.data?.hits?.hits?.length > 0) {
          _camera = await Camera.findById(logPersonnel.data.hits.hits[0]?._source?.camera_id).populate("section_id").exec();
        }
        // else {
        //   data.push(per);
        //   continue;
        // }

        (per.lastCameraSeen = _camera ? _camera.name : ""), (per.lastSection = _camera ? _camera.section_id : "");
        per.lastTimeSeen = new Date(logPersonnel.data?.hits?.hits[0]?._source?.timestamp);
        // per.lastTimeSeen = randomDate('02/13/2020', '01/01/2022');
        data.push(per);
      }
      //send response
      return res.status(200).json({
        success: true,
        data: data,
        page: parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1,
        perPage: req.query.search as string,
        total: await Personnel.countDocuments().exec(),
        pages: Math.ceil((await Personnel.countDocuments().exec()) / Number(req.query.search as string)),
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  });

router.get("/search", async function (req: Request, res: Response, next: NextFunction) {
  try {
    var query = url.parse(req.url, true).query.params as string;

    const regex = new RegExp(query, 'i')
    let personnel = await Personnel.find({
      $or: [
        { first_name: { $regex: regex } },
        { last_name: { $regex: regex } },
        { national_code: { $regex: regex } },
        { personnel_code: { $regex: regex } },
        { phone_number: { $regex: regex } }]
    })
      .exec();
    return res.status(200).json({
      success: true,
      data: personnel,
    });

  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

//route for get personnel by id from DB
router.get("/:id",
  readByIdMiddleware(Personnel)
);

//add route for edit personnel
router.patch("/:id",
  updateByIdMiddleware(Personnel, { next: true, save: "doc" }),
  fs.uploadAvatarMiddleware("avatar_str", ["doc", "_id"], {}, "doc"),
);

//add route for delete personnel
router.delete("/:id",
  deleteByIdMiddleware(Personnel, { next: true, save: "doc" }), //also deletes image vector in post remove schema
  fs.deleteDirectoryMiddleware(["doc", "_id"], { force: true, send: "doc" })
);

export default router;
