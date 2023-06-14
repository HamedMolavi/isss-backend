import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import Notification, { INotification } from "../../models/notification";
import { Access } from "../../tools/enums/access";
import { getAccessAndVerify } from "./../../tools/authentication";

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
  try {  getAccessAndVerify(req,Access.Configuration,"user",next)
    //get jason from body request
    const newNotif: INotification = req.body;
    //verify body request
    if (!newNotif.phone_number && !newNotif.email) {
      req.flash("error", "Please enter phone number or email");
      return next(new ApiError(400, "Please enter phone number or email"));
    }

    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
   //   return null;
  //  }

    //query for save new notification in DB
    //check if notification exist
    let notification = await Notification.findOne({
      $and: [
        { cameras: newNotif.cameras },
        {
          $or: [{ phone_number: { $in: newNotif.phone_number } }, { emails: { $in: newNotif.phone_number } }],
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

//route for get notifications list
router.get("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get page from url
    let strPage = req.query.page as string;
    let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
    //get perPage from url
    let strPerPage = req.query.perPage as string;
    let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }
    //query for get notifications from DB
    let notifications: INotification[] = await Notification.find({})
     // .populate("cameras")
     // .populate("types")
      .limit(perPage)
      .skip(perPage * (page - 1))
      .exec();

    //return not found if notifications not exist
    if (!notifications) {
      req.flash("error", "Notifications not found");
      return next(new ApiError(404, "Notifications not found"));
    }
    //send response
    return res.status(200).json({
      success: true,
      data: notifications,
      page: page,
      perPage: perPage,
      total: await Notification.countDocuments().exec(),
      pages: Math.ceil((await Notification.countDocuments().exec()) / perPage),
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//route for get notification by id from DB
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id;
    if (!id) {
      req.flash("error", "Please enter specifies notification id");
      return next(new ApiError(400, "Please enter specifies notification id"));
    }

    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }

    //query for get notification by id from DB
    let notification = await Notification.findById(id).exec();
    //return not found if notification not exist
    if (!notification) {
      req.flash("error", "Notification not found");
      return next(new ApiError(404, "Notification not found"));
    }
    //send response
    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//add route for edit notification
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id = req.params.id as Object;
    if (!id) {
      req.flash("error", "Please enter specifies notification id");
      return next(new ApiError(400, "Please enter specifies notification id"));
    }
    //get jason from body request
    const notificationBody = req.body;
    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
   //   return null;
   // }

    //query for get notification by id from DB
    let notification = await Notification.findByIdAndUpdate(id, notificationBody, {
      new: true,
    }).exec();
    //return not found if notification not exist
    if (!notification) {
      req.flash("error", "Notification not found");
      return next(new ApiError(404, "Notification not found"));
    }
    //send response
    return res.status(201).json({
      message: "Success",
      section: notification,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//add route for delete notification
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {getAccessAndVerify(req,Access.Configuration,"user",next)
    //get id from url
    let id = req.params.id;
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }

    //query for get notification by id from DB
    let notification = await Notification.findByIdAndDelete(id).exec();
    //return not found if notification not exist
    if (!notification) {
      req.flash("error", "Notification not found");
      return next(new ApiError(404, "Notification not found"));
    }
    //send response
    return res.status(201).json({
      message: "Success",
      section: notification,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

export default router;
