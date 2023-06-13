import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import { ApiError } from "../../error/error.handler";
import PersonImage from "../../models/personImage";
import { getAccessAndVerify } from "./../../tools/authentication";
import { deleteFiles, readFiles } from "../../tools/fileUpload";
import { Access } from "../../tools/enums/access";

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

//route for get personnel by id from DB
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    let id: string = req.params.id;
    //verify body request
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }

    //query for get personnel by id from DB
    let personImages = await PersonImage.find({ person_id: id }).exec();

    //send not found if personnel not found
    if (!personImages) {
      req.flash("error", "personImages not found");
      return next(new ApiError(404, "personImages not found"));
    }
    //define path folder fo read files
    let pathRead = path.join(__dirname, `./../../../assets/image/${id}/`);
    let faces_base64: Object[] | null = [];
    //check for exist path
    faces_base64 = await readFiles(pathRead); //read all file in directory path an convert to base62 and get list base64
    if (faces_base64 == null) {
      req.flash("error", "path not found");
      return next(new ApiError(404, "not found"));
    }
    //return response to client
    return res.status(201).json({
      success: true,
      data: faces_base64,
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

//add route for delete image from folder assets\image
router.delete("/:hashid", async function (req: Request, res: Response, next: NextFunction) {
  try {
    getAccessAndVerify(req,Access.Configuration,"user",next)
    //get id from url
    let hashid = req.params.hashid;
    if (!hashid) {
      req.flash("error", "Please enter hashid");
      return next(new ApiError(400, "Please enter hashid"));
    }
    //get token from header request and verify
  //  let token = getTokenAndVerify(req, const_role, next);
  //  if (!token) {
  //    return null;
  //  }
    //query for get personnel by id from DB
    let personimage = await PersonImage.findOne({ hash_id: hashid }).exec();
    if (!personimage) {
      req.flash("error", "personimage Not Found");
      return next(new ApiError(404, "personimage Not Found"));
    }
    //decleare file name for delete
    let fileName = `${personimage.person_id.toString()}-${hashid}.jpeg`;
    //define path folder fo read files
    let pathDelete = path.join(__dirname, `./../../../assets/image/${personimage.person_id.toString()}/`);
    let result = await deleteFiles(fileName, pathDelete); //delete file in assets folder
    if (!result) {
      req.flash("error", "image not found");
      return next(new ApiError(404, "image not found"));
    }
    //delete from mongo
    let personimageDeleted = await PersonImage.findOneAndDelete({ hash_id: hashid }).exec();
    //send response
    return res.status(201).json({
      success: true,
      data: personimageDeleted,
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

export default router;
