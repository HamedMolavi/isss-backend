import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import Camera from "../../models/camera";
import Model from "../../models/model";
import ModelToCamera, { IModelToCamera } from "../../models/modelToCamera";
import { getAccessAndVerify } from "../../tools/authentication";
import { convertToCron, convertToCronDay } from "../../tools/convertTime";
import { Access } from "../../tools/enums/access";

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

//add route for register modelToCamera
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {      getAccessAndVerify(req,Access.Configuration,"user",next)
    //get jason from body request
    const { camera_id, start, stop, dayOfWeek, model_id } = req.body;
    //verify body request
    if (!camera_id || start || stop || !dayOfWeek || !model_id) {
      req.flash("error", "Departement name is required");
      return next(new ApiError(400, "Departement name is required"));
    }
    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }

    //convert input time to cron format
    let start_cron: string = convertToCron(start);
    start_cron = convertToCronDay(start_cron, dayOfWeek.toString());
    let stop_cron: string = convertToCron(stop);
    stop_cron = convertToCronDay(stop_cron, dayOfWeek.toString());

    //query for save new schedule in DB
    let modelToCamera = await ModelToCamera.findOne({
      $and: [{ start_cron: start_cron }, { stop_cron: stop_cron }, { model_id: model_id }, { camera_id: camera_id }],
    }).exec();

    if (modelToCamera) {
      req.flash("error", "This modelToCamera is already exist");
      return next(new ApiError(400, "This schedule is already exist"));
    }

    //create new modelToCamera
    modelToCamera = new ModelToCamera({
      camera_id: camera_id,
      start_cron: start_cron,
      stop_cron: stop_cron,
      model_id: model_id,
    });

    //save modelToCamera
    await modelToCamera.save();

    //send response
    res.status(201).json({
      success: true,
      data: modelToCamera,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

// //route for get modelsToCamera list
// router.get("", async function (req: Request, res: Response, next: NextFunction) {
//   try {
//     //get page from url
//     let strPage = req.query.page as string;
//     let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
//     //get perPage from url
//     let strPerPage = req.query.perPage as string;
//     let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
//     let search = (req.query.search as string) || "";

//     //get token from header request and verify
//     let token = getTokenAndVerify(req, const_role, next);
//     if (!token) {
//       return null;
//     }
//     //query for get departements list
//     let model2Cameras: IModelToCamera[] = [];
//     if (!(search && search.length > 0)) {
//       let camera = await Camera.find({
//         name: { $regex: search, $options: "i" },
//       })
//         .skip((page - 1) * perPage)
//         .limit(perPage)
//         .exec();
//       model2Cameras = await ModelToCamera.find({
//         camera_id: { $regex: camera[0]._id.toString(), $options: "i" },
//       })
//         .limit(perPage)
//         .skip(perPage * (page - 1))
//         .exec();
//     } else {
//       model2Cameras = await ModelToCamera.find({})
//         .limit(perPage)
//         .skip(perPage * (page - 1))
//         .exec();
//     }

//     //return response not found to client if not found modelToCamera
//     if (!model2Cameras) {
//       req.flash("error", "modelToCamera not found");
//       return next(new ApiError(404, "modelToCamera not found"));
//     }
//     let response: [{}] = [{}];
//     //ceate json response
//     let json = model2Cameras.forEach(async (model2Camera) =>
//       response.push({
//         camera:
//           (await Camera.findById({})
//             .skip((page - 1) * perPage)
//             .limit(perPage)
//             .exec()) ?? "not found",
//         model: await Model.findById({})
//           .skip((page - 1) * perPage)
//           .limit(perPage)
//           .exec(),
//       })
//     );
//     //return response to client with modelToCamera list
//     return res.status(200).json({
//       success: true,
//       data: response,
//       page: page,
//       perPage: perPage,
//       total: await ModelToCamera.countDocuments().exec(),
//       pages: Math.ceil((await ModelToCamera.countDocuments().exec()) / perPage),
//     });
//   } catch (err: any) {
//     return next(new ApiError(500, "internal server error" + err.message));
//   }
// });

//route for get modelsToCamera list
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
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }
    //query for get departements list
    let model2Cameras = await ModelToCamera.find({}).exec();

    //return response not found to client if not found modelToCamera
    if (!model2Cameras) {
      req.flash("error", "modelToCamera not found");
      return next(new ApiError(404, "modelToCamera not found"));
    }
    //ceate json response
    //return response to client with modelToCamera list
    return res.status(200).json({
      success: true,
      data: model2Cameras,
      page: page,
      perPage: perPage,
      total: await ModelToCamera.countDocuments().exec(),
      pages: Math.ceil((await ModelToCamera.countDocuments().exec()) / perPage),
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//add route for edit modelToCamera
router.patch("", async function (req: Request, res: Response, next: NextFunction) {
  try {  getAccessAndVerify(req,Access.Configuration,"user",next)
    //get camera_id and model_id from body
    let { camera_id, model_id, is_enabled } = req.body;
    if (!camera_id || !model_id) {
      req.flash("error", "Please enter all fields");
      return next(new ApiError(400, "Please enter all fields"));
    }
    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }
    let model2Camera = await ModelToCamera.findOneAndUpdate(
      {
        $and: [{ model_id: model_id }, { camera_id: camera_id }],
      },
      { is_enabled: is_enabled },
      { new: true }
    ).exec();
    //return not found if section not exist
    if (!model2Camera) {
      req.flash("error", "model2Camera not found");
      return next(new ApiError(404, "model2Camera not found"));
    }
    //send response
    return res.status(201).json({
      message: "Success",
      data: model2Camera,
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

export default router;
