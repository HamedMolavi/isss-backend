import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import User from "../../models/user";

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


//api for login user
router.post("", async function (req: Request, res: Response, next: Function) {
  try {
    //get jason from body request
    let { username, password , is_remember} = req.body;
    //verify body request
    if (!username || !password) {
      return next({
        status: 400,
        message: "Bad request",
        name: "user",
      });
    }
    //  get user from DB
    let user = await User.findOne({ username: username }).exec();
    if (!user) {
      return next(new ApiError(404, "User not found"));
    }
    //check password
    let isMatch = await user.checkPassword(password, (err: any, isMatch: any) => {
      if (err) {
        return next(new ApiError(500, "internal server error , " + err.message));
      }
      return isMatch;
    });
    if (!isMatch) {
      return next(new ApiError(401, "Password is incorrect"));
    }
    //send response
    return res.status(200).json({
      success: true,
      data: user.toAuthJSON(is_remember),
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error , " + err.message));
  }
});

export default router;
