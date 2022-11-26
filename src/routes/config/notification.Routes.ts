import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import Notification, { INotification } from "../../models/notification";
import Section, { ISection } from "./../../models/section";
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

//add route for register new notification
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get jason from body request
    const newNotif: INotification = req.body;
    //verify body request
    if (!newNotif.phone_numbers && !newNotif.emails) {
      req.flash("error", "Please enter phone number or email");
      return next(new ApiError(400, "Please enter phone numbers or emails"));
    }

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for save new notification in DB
    //check if notification exist
    let notification = await Notification.findOne({
      $and: [
        { cameras: { $in: newNotif.cameras } },
        {
          $or: [{ phone_number: { $in: newNotif.phone_numbers } }, { emails: { $in: newNotif.phone_numbers } }],
        },
      ],
    }).exec();

    //check if notification exist
    if (notification) {
      req.flash("error", "Notification already exist");
      return next(new ApiError(400, "Notification already exist"));
    }

    //set notification data
    let _newNotification = new Notification(newNotif);
    //_newNotification = newNotif;

    //save notification in DB
    await _newNotification.save();
    req.flash("info", "notification has been registered");
    //send response
    return res.status(201).json({
      success: true,
      data: _newNotification,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//route for get sections list
router.get("", async function (req: Request, res: Response, next: NextFunction) {
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
    if (!token) {
      return null;
    }
    //query for get sections from DB
    let sections: ISection[] = [];
    if (!(search && search.length > 0)) {
      sections = await Section.find({
        name: { $regex: search, $options: "i" },
      })
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
    } else {
      sections = await Section.find({})
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
    }

    //return not found if sections not exist
    if (!sections) {
      req.flash("error", "Section not found");
      return next(new ApiError(404, "Section not found"));
    }
    //send response
    return res.status(200).json({
      success: true,
      data: sections,
      page: page,
      perPage: perPage,
      total: await Section.countDocuments().exec(),
      pages: Math.ceil((await Section.countDocuments().exec()) / perPage),
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//route for get section by id from DB
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id;
    if (!id) {
      req.flash("error", "Please enter all fields");
      return next(new ApiError(400, "Please enter all fields"));
    }

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for get section by id from DB
    let section = await Section.findById(id).exec();
    //return not found if section not exist
    if (!section) {
      req.flash("error", "Section not found");
      return next(new ApiError(404, "Section not found"));
    }
    //send response
    return res.status(200).json({
      success: true,
      data: section,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//add route for edit section
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id = req.params.id as Object;
    if (!id) {
      req.flash("error", "Please enter all fields");
      return next(new ApiError(400, "Please enter all fields"));
    }
    //get jason from body request
    const sectionBody = req.body;
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
    let _section1, _section2;
    if (sectionBody.department_id) {
      _section1 = await Section.findOne({ department_id: sectionBody.department_id }).exec();
    }
    if (sectionBody.name) {
      _section2 = await Section.findOne({ department_id: sectionBody.name }).exec();
    }

    if (_section1 && _section2) {
      req.flash("error", "Section and department_id not defrrent");
      return next(new ApiError(400, "Section and department_id not defrrent"));
    }

    //query for get section by id from DB
    let section = await Section.findByIdAndUpdate(id, sectionBody, {
      new: true,
    }).exec();
    //return not found if section not exist
    if (!section) {
      req.flash("error", "Section not found");
      return next(new ApiError(404, "Section not found"));
    }
    //send response
    return res.status(201).json({
      message: "Success",
      section: section,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//add route for delete section
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id = req.params.id;
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for get section by id from DB
    let section = await Section.findByIdAndDelete(id).exec();
    //return not found if section not exist
    if (!section) {
      req.flash("error", "Section not found");
      return next(new ApiError(404, "Section not found"));
    }
    //send response
    return res.status(201).json({
      message: "Success",
      section: section,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

export default router;
