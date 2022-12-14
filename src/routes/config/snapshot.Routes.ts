import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import Camera, { ICamera } from "../../models/camera";
import { getTokenAndVerify } from "../../tools/authentication";
import takeSnapshot, { cameraInfo } from "../../tools/takeSnaphsot";

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

//route for get snapshot from camera with ip and username and password
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    let id: string = req.params.id; //get query parameter id from url
    //return null if id not found
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
    //query for get camera from DB
    let camera: ICamera | null = await Camera.findById(id).exec();
    //return response not found to client if not found camera
    if (!camera) {
      req.flash("error", "camera not found");
      return next(new ApiError(404, "camera not found"));
    }
    let _camInfo: cameraInfo = {
      ip: camera.ip,
      username: camera.username,
      password: camera.password,
    };
    let snapshotBase64: string | null | undefined = await takeSnapshot(_camInfo);

    if (!snapshotBase64) {
      req.flash("error", "There was a problem on creating the image, please try again");
      return next(new ApiError(404, "There was a problem on creating the image, please try again"));
    }

    //return response to client with departements file list
    return res.status(200).json({
      success: true,
      data: snapshotBase64,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

export default router;
