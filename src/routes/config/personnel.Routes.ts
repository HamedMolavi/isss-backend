import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import { requestForGetPersonnel } from "../../db/elastic/connect.database";
import { ApiError } from "../../types/classes/error.class";
import Camera from "../../db/mongo/models/camera";
import url from "url"
import PersonImage from "../../db/mongo/models/personImage";
import { deleteDirectory, uploadAvatar } from "../../tools/redisFile.tools";
import Personnel from "../../db/mongo/models/personnel";
import { IPersonnel } from "../../types/interfaces/personnel.interface";

//create router for add to routes file
const router: Router = Router();

//add route for register new personnel
router.post("",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      for (const key of ["job_id", "section_id"]) {
        if (req.body[key] === "") delete req.body[key]
      };

      //get json from body request
      const { first_name, last_name, national_code, email, phone_number, job_id, tracked, personnel_code, section_id, camera_whitelist, is_active, is_employee, is_dismissed, avatar_str } =
        req.body;

      //verify body request
      //|| !email || !job_id || !section_id || !camera_whitelist
      if (!first_name || !last_name || !national_code || !phone_number || !personnel_code) {
        req.flash("error", "Please fill all fields");
        return next(new ApiError(400, "Please fill all fields"));
      };

      //query for save new personnel in DB
      let personnel = await Personnel.findOne({
        $or: [{ national_code: national_code }, { personnel_code: personnel_code }],
      }).exec();

      //check personnel in DB
      if (personnel) {
        req.flash("error", "Personnel already exists");
        return next(new ApiError(400, "Personnel already exists"));
      };
      //create new personnel
      personnel = new Personnel({
        first_name,
        last_name,
        national_code,
        email,
        phone_number,
        job_id,
        tracked,
        personnel_code,
        section_id,
        camera_whitelist,
        is_active,
        is_employee,
        is_dismissed,
      });

      //save personnel in DB
      let _personnnel = await personnel.save();
      req.flash("info", "Personnel has been registered");

      //save personnel avatar in hardDisk
      let avatarStr = avatar_str.split(",")[1];
      req.body["avatarStr"] = avatarStr;
      req.body["id"] = _personnnel._id.toString();
      req.body["data"] = _personnnel.toJSON();
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    };
  },
  uploadAvatar("avatarStr", "id", "data"),
);

//route for get personnels list
router.get("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get page from url
    let strPage = req.query.page as string;
    let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
    //get perPage from url
    let strPerPage = req.query.perPage as string;
    let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
    let search = (req.query.search as string) || "";
    //query for get user by personnels from DB

    let personnels: IPersonnel[] = [];
    if (!(search && search.length > 0)) {
      personnels = await Personnel.find({
        name: { $regex: search, $options: "i" },
      })
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
    } else {
      personnels = await Personnel.find()
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
    }

    //send not found if personnels not found
    if (!personnels) {
      req.flash("error", "Personnels not found");
      return next(new ApiError(404, "Personnels not found"));
    }
    let data: object[] = [];
    for (let _personnel of personnels) {
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
      page: page,
      perPage: perPage,
      total: await Personnel.countDocuments().exec(),
      pages: Math.ceil((await Personnel.countDocuments().exec()) / perPage),
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});


// function randomDate(date1: any, date2: any) {
//   function randomValueBetween(min: any, max: any) {
//     return Math.random() * (max - min) + min;
//   }
//   var date1 = date1 || "01-01-1970";
//   var date2 = date2 || new Date().toLocaleDateString();
//   date1 = new Date(date1).getTime();
//   date2 = new Date(date2).getTime();
//   if (date1 > date2) {
//     return new Date(randomValueBetween(date2, date1)).toLocaleDateString();
//   } else {
//     return new Date(randomValueBetween(date1, date2)).toLocaleDateString();
//   }
// }

// function randomDate(start, end, startHour, endHour) {
//   var date = new Date(+start + Math.random() * (end - start));
//   var hour = startHour + Math.random() * (endHour - startHour) | 0;
//   date.setHours(hour);
//   return date;
// }


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
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    let id: string = req.params.id;
    //return error if id not found
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

    //query for get personnel by id from DB
    let personnel = await Personnel.findById(id).exec();

    //send not found if personnel not found
    if (!personnel) {
      req.flash("error", "Personnel not found");
      return next(new ApiError(404, "Personnel not found"));
    }

    //send response
    return res.status(200).json({
      success: true,
      data: personnel.toJSON(),
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

//add route for edit personnel
router.patch("/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;

      if (!id) {
        req.flash("error", "Please enter id");
        return next(new ApiError(400, "Please enter id"));
      }

      const personnelBody = req.body;
      //query for get personnel by id from DB
      let personnel = await Personnel.findByIdAndUpdate(id, personnelBody, {
        new: true,
      }).exec();

      //send not found if personnel not found
      if (!personnel) {
        req.flash("error", "Personnel not found");
        return next(new ApiError(404, "Personnel not found"));
      }

      if (personnelBody.avatar_str) {
        //save personnel avatar in hardDisk
        let avatarStr = personnelBody.avatar_str.split(",")[1];
        req.body["avatarStr"] = avatarStr;
        req.body["id"] = personnel._id.toString();
        req.body["data"] = personnel.toJSON();
        return next();
      } else {
        return res.status(201).json({
          success: true,
          data: personnel.toJSON(),
        });
      };
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    };
  },
  uploadAvatar("avatarStr", "id", "data")
);

//add route for delete personnel
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id = req.params.id;
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

    //query for get personnel by id from DB
    let personnel = await Personnel.findByIdAndDelete(id).exec();

    //send not found if personnel not found
    if (!personnel) {
      req.flash("error", "Personnel not found");
      return next(new ApiError(404, "Personnel not found"));
    }
    //delete image vector
    let personImages = await PersonImage.deleteMany({ person_id: personnel._id }).exec();

    //define path folder fo read files
    let pathDelete = path.join(__dirname, `./../../../assets/image/${id}`);
    //delete face image directory
    deleteDirectory(pathDelete, true);
    //send response
    return res.status(201).json({
      success: true,
      // data: personnel.toJSON(),
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

export default router;
