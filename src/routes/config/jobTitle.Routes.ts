import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import JobTitle, { IJobTitle } from "./../../models/jobTitle";
//import { getTokenAndVerify } from "./../../tools/authentication";


//get user role from enviroment variable
const const_role = process.env.const_role || "user";

//create router for add to server file
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

//add route for register new jobTitle
router.post(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get jason from body request
      const { name } = req.body;
      //verify body request
      if (!name) {
        req.flash("error", "Please enter a name");
        return next(new ApiError(400, "Please enter a jobTitle"));
      }
      //get token from header request and verify
    //  let token = getTokenAndVerify(req, const_role, next);
    //  if(!token){
    //    return null;
    //  }

      //query for save new jobTitle in DB
      let jobTitle = await JobTitle.findOne({ name: name }).exec();

      //check if jobTitle is exist
      if (jobTitle) {
        req.flash("error", "JobTitle is exist");
        return next(new ApiError(400, "JobTitle is exist"));
      }

      //set value for new jobTitle
      let newjobTitle = new JobTitle();
      newjobTitle.name = name;

      //save new jobTitle in DB
      await newjobTitle.save();

      //send response
      return res.status(201).json({
        success: true,
        data: newjobTitle,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  }
);

//route for get jobTitle list
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
      let search = (req.query.search as string) ?? "";
      //get token from header request and verify
    //  let token = getTokenAndVerify(req, const_role, next);
    //  if(!token){
    //    return null;
    //  }

      //query for get jobTitle from DB
      let jobTitles: IJobTitle[] = [];
      if (search && search.length > 0) {
        jobTitles = await JobTitle.find({
          name: { $regex: search, $options: "i" },
        })
          .limit(perPage)
          .skip(perPage * (page - 1))
          .exec();
      } else {
        jobTitles = await JobTitle.find()
          .limit(perPage)
          .skip(perPage * (page - 1))
          .exec();
      }

      //return response not found to client if not found jobTitles
      if (!jobTitles) {
        req.flash("error", "Not found jobTitles");
        return next(new ApiError(404, "Not found jobTitles"));
      }

      //send response
      return res.status(200).json({
        success: true,
        data: jobTitles,
        page: page,
        perPage: perPage,
        total: await JobTitle.countDocuments().exec(),
        pages: Math.ceil((await JobTitle.countDocuments().exec()) / perPage),
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  }
);

//route for get jobTitle by id from DB
router.get(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "JobTitle id is required");
        return next(new ApiError(400, "JobTitle id is required"));
      }

      //get token from header request and verify
    //  let token = getTokenAndVerify(req, const_role, next);
    //  if(!token){
    //    return null;
    //  }

      //query for get jobTitle by id from DB
      let jobTitle = await JobTitle.findById(id).exec();

      //return response not found to client if not found jobTitle
      if (!jobTitle) {
        req.flash("error", "JobTitle not found");
        return next(new ApiError(404, "JobTitle not found"));
      }

      //send response
      return res.status(200).json({
        success: true,
        data: jobTitle,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error -> " + err.message));
    }
  }
);

//add route for edit jobTitle
router.patch(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "JobTitle id is required");
        return next(new ApiError(400, "JobTitle id is required"));
      }
      //get body from request
      const jobTitleBody = req.body;
      //get token from header request and verify
    //  let token = getTokenAndVerify(req, const_role, next);
    //  if(!token){
    //    return null;
    //  }
      //query for get jobTitle by id from DB
      let jobTitle = await JobTitle.findByIdAndUpdate(id, jobTitleBody, {
        new: true,
      }).exec();

      //return response not found to client if not found jobTitle
      if (!jobTitle) {
        req.flash("error", "JobTitle not found");
        return next(new ApiError(404, "JobTitle not found"));
      }

      //send response
      return res.status(201).json({
        success: true,
        data: jobTitle,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  }
);

//add route for delete jobTitle
router.delete(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        return next({ status: 400, message: "Bad request" });
      }

      //get token from header request and verify
    //  let token = getTokenAndVerify(req, const_role, next);
    //  if(!token){
    //    return null;
    //  }

      //query for get jobTitle by id from DB
      let jobTitle = await JobTitle.findByIdAndDelete(id).exec();

      //return response not found to client if not found jobTitle
      if (!jobTitle) {
        req.flash("error", "JobTitle not found");
        return next(new ApiError(404, "JobTitle not found"));
      }

      //send response
      return res.status(201).json({
        success: true,
        data: jobTitle,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  }
);

export default router;
