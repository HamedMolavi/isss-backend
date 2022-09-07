import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import Personnel, { IPersonnel } from "./../../models/personnel";
import { getTokenAndVerify } from "./../../tools/authentication";

//get user role from enviroment variable
const const_role = process.env.const_role || "user";

//create router for add to routes file
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

//add route for register new personnel
router.post(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get jason from body request
      const {
        first_name,
        last_name,
        national_code,
        email,
        phone_number,
        job_id,
        personnel_code,
        section_id,
        camera_whitelist,
        is_active,
        is_employee,
        is_dismissed,
      } = req.body;
      //verify body request
      if (
        !first_name ||
        !last_name ||
        !national_code ||
        !email ||
        !phone_number ||
        !job_id ||
        !personnel_code ||
        !section_id ||
        !camera_whitelist ||
        !is_active ||
        !is_employee ||
        !is_dismissed 
      ) {
        req.flash("error", "Please fill all fields");
        return next(new ApiError(400, "Please fill all fields"));
      }

      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }
      //query for save new personnel in DB
      let personnel = await Personnel.findOne({
        $or: [
          { national_code: national_code },
          { personnel_code: personnel_code },
        ],
      }).exec();

      //check personnel in DB
      if (personnel) {
        req.flash("error", "Personnel already exists");
        return next(new ApiError(400, "Personnel already exists"));
      }

      //create new personnel
      personnel = new Personnel({
        first_name,
        last_name,
        national_code,
        email,
        phone_number,
        job_id,
        personnel_code,
        section_id,
        camera_whitelist,
        is_active,
        is_employee,
        is_dismissed,
      });

      //save personnel in DB
      await personnel.save();
      req.flash("info", "Personnel has been registered");
      //send response
      res.status(201).json({
        success: true,
        data: personnel.toJSON(),
      });
    } catch (err: any) {
      return next(new ApiError(500,"Internal server error , " + err.message));
    }
  }
);

//route for get personnels list
router.get(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
      let search = (req.query.search as string) || "";
      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }
      if(!token){
        return null;
      }
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
        return next(
          new ApiError(404, "Personnels not found")
        );
      }
      //send response
      return res.status(200).json({
        success: true,
        data: personnels.map((personnel) => {return personnel.toJSON();}),
        page: page,
        perPage: perPage,
        total: await Personnel.countDocuments().exec(),
        pages: Math.ceil((await Personnel.countDocuments().exec()) / perPage),
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
);

//route for get personnel by id from DB
router.get(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      let id: string = req.params.id;
      //verify body request
      if (!id) {
        req.flash("error", "Please enter id");
        return next(new ApiError(400, "Please enter id"));
      }

      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
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
  }
);

//add route for edit personnel
router.patch(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "Please enter id");
        return next(new ApiError(400, "Please enter id"));
      }

      const personnelBody = req.body;
      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }
      //query for get personnel by id from DB
      let personnel = await Personnel.findByIdAndUpdate(id, personnelBody, {
        new: true,
      }).exec();

      //send not found if personnel not found
      if (!personnel) {
        req.flash("error", "Personnel not found");
        return next(new ApiError(404, "Personnel not found"));
      }

      //send response
      return res.status(201).json({
        success: true,
        data: personnel.toJSON(),
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
);

//add route for delete personnel
router.delete(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id = req.params.id;
      if (!id) {
        req.flash("error", "Please enter id");
        return next(new ApiError(400, "Please enter id"));
      }

      //get token from header request and verify
      let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }
      //query for get personnel by id from DB
      let personnel = await Personnel.findByIdAndDelete(id).exec();

      //send not found if personnel not found
      if (!personnel) {
        req.flash("error", "Personnel not found");
        return next(new ApiError(404, "Personnel not found"));
      }

      //send response
      return res.status(201).json({
        success: true,
        data: personnel.toJSON(),
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
);

export default router;
