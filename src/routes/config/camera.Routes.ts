import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import Camera, { ICamera } from "./../../models/camera";
import { getTokenAndVerify } from "./../../tools/authentication";

//get user role from enviroment variable
const const_role = process.env.const_role || "user";

//create router for add to server
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

//add route for register new camera
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get jason from body request
    const { section_id, url, ip, name, username, password,network ,is_enabled }: ICamera = req.body;
    //verify body request
    if (!section_id || !url || !ip || !name || !username || !password || !is_enabled || !network) {
      req.flash("error", "please complete all fields");
      return next(new ApiError(400, "please complete all fields"));
    }

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for save new Camera in DB
    let camera = await Camera.findOne({
      $or: [{ ip: ip }],
    }).exec();

    //return error if camera already exist
    if (camera) {
      req.flash("error", "camera already exist");
      return next(new ApiError(400, "camera already exist"));
    }

    //fil new camera
    camera = new Camera({
      section_id: section_id,
      url: url,
      ip: ip,
      network:network,
      name: name,
      username: username,
      password: password,
      is_enabled: is_enabled,
    });

    //save camera in DB
    await camera.save();

    //return success
    req.flash("info", "camera added");
    return res.status(201).json({
      success: true,
      data: camera,
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

//route for get cameras list
router.get("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get page from url
    let strPage = req.query.page as string;
    let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
    let search = (req.query.search as string) || "";
    //get perPage from url
    let strPerPage = req.query.perPage as string;
    let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
    let cameras: ICamera[] = [];
    //query for get cameras list
    if (search !== "") {
      cameras = await Camera.find({
        name: { $regex: search, $options: "i" },
      })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec();
    } else {
      cameras = await Camera.find({})
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
    }

    //return response not found to client if not found cameras
    if (!cameras) {
      req.flash("error", "Cameras not found");
      return next(new ApiError(404, "Cameras not found"));
    }

    //return response to client with departements list
    return res.status(200).json({
      success: true,
      data: cameras,
      page: page,
      perPage: perPage,
      total: await Camera.countDocuments().exec(),
      pages: Math.ceil((await Camera.countDocuments().exec()) / perPage),
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//route for get camera by id from DB
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from params in url
    let id: string = req.params.id;
    if (!id) {
      req.flash("error", "id not found");
      return next({ status: 400, message: "Bad request" });
    }
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for get camera by id from DB
    let camera = await Camera.findById(id).exec();

    //return error if camera not found
    if (!camera) {
      req.flash("error", "camera not found");
      return next(new ApiError(404, "camera not found"));
    }

    //send response to client with camera
    return res.status(200).json({
      success: true,
      data: camera,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//add route for edit camera
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id;
    if (!id) {
      req.flash("error", "id not found");
      return next(new ApiError(400, "Bad request id not found"));
    }
    //get jason from body request
    const cameraBody = req.body;
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
    //query for get user by id from DB
    let camera = await Camera.findByIdAndUpdate(id, cameraBody, {
      new: true,
    }).exec();
    //return error if user not found
    if (!camera) {
      req.flash("error", "camera not found");
      return next(new ApiError(404, "camera not found"));
    }
    //send response to client with user
    return res.status(201).json({
      success: true,
      data: camera,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

//add route for delete camera
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id = req.params.id;
    if (!id) {
      return next(new ApiError(400, "Bad request id not found"));
    }

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for get camera by username from DB
    let camera = await Camera.findByIdAndDelete(id).exec();
    //return error if camera not found
    if (!camera) {
      req.flash("error", "camera not found");
      return next(new ApiError(404, "camera not found"));
    }
    //send response to client with camera
    return res.status(201).json({
      success: true,
      data: camera,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

export default router;
