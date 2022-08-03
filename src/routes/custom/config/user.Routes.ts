import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../../error/error.handler";
import User, { IUser } from "../../../models/user";
import { getTokenAndVerify } from "../../../tools/authentication";
import { getStrength } from "../../../tools/verifyPasswordRegex";

//create router for add to server
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

//add route for register new user
router.post(
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get jason from body request
      const {
        username,
        password,
        phone_number,
        event,
        camera,
        report,
        configuration,
      }: IUser = req.body;

      //verify body request
      if (!username || !password || !phone_number) {
        req.flash("error", "Please enter all fields");
        return next(new ApiError(400, "Please enter all fields"));
      }
      //get token from header request and verify
      let token = getTokenAndVerify(req, "admin", next);

      //verify password
      let resultVerifyPassword = getStrength(password);
      if (resultVerifyPassword < 99) {
        req.flash("error", "Password is not strong enough");
        return next(new ApiError(400, "Password is not strong enough"));
      }

      //query for save new user in DB
      let user = await User.findOne({
        $or: [{ username: username }, { phone_number: phone_number }],
      }).exec();

      //check user in DB
      if (user) {
        req.flash("error", "User already exists");
        return next(new ApiError(400, "User already exists"));
      }

      //set data for new user
      let newUser = new User();
      newUser.username = username;
      newUser.password = password;
      newUser.phone_number = phone_number;
      newUser.role = "admin";
      newUser.event = event;
      newUser.camera = camera;
      newUser.report = report;
      newUser.configuration = configuration;

      //save new user in DB
      await newUser.save();
      req.flash("info", "User created");
      //send response
      return res.status(201).json({
        success: true,
        data: newUser.toJSON(),
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error" + err.message));
    }
  }
);

//route for get users list
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
      let search = req.query.search as string;
      //get token from header request and verify
      let token = getTokenAndVerify(req, "admin", next);
      //query for get user by username from DB
      let users: IUser[] = [];
      if (!(search && search.length > 0)) {
        users = await User.find({
          name: { $regex: search, $options: "i" },
        })
          .limit(perPage)
          .skip(perPage * (page - 1))
          .exec();
      } else {
        users = await User.find()
          .limit(perPage)
          .skip(perPage * (page - 1))
          .exec();
      }

      //send not found if user not found
      if (!users) {
        req.flash("error", "User not found");
        return next(new ApiError(404, "User not found"));
      }
      //send response
      return res.status(200).json({
        success: true,
        data: users,
        page: page,
        perPage: perPage,
        total: await User.countDocuments().exec(),
        pages: Math.ceil((await User.countDocuments().exec()) / perPage),
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

//route for get user by id from DB
router.get(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "Please enter id");
        return next(new ApiError(400, "Please enter id"));
      }

      //get token from header request and verify
      let token = getTokenAndVerify(req, "admin", next);

      //query for get user by id from DB
      let user = await User.findById(id).exec();

      //send not found if user not found
      if (!user) {
        req.flash("error", "User not found");
        return next(new ApiError(404, "User not found"));
      }

      //send response
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

//add route for edit user
router.patch(
  "/:id",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id as string;
      if (!id) {
        req.flash("error", "Please enter id");
        return next(new ApiError(400, "Please enter id"));
      }
      //get jason from body request
      const userBody = req.body;
      //get token from header request and verify
      let token = getTokenAndVerify(req, "admin", next);
      //query for get user by username from DB
      let user = await User.findByIdAndUpdate(id, userBody, {
        new: true,
      }).exec();

      //send not found if user not found
      if (!user) {
        req.flash("error", "User not found");
        return next(new ApiError(404, "User not found"));
      }

      //send response
      return res.status(201).json({
        success: true,
        data: user,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

//add route for delete user
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
      let token = getTokenAndVerify(req, "admin", next);
      //query for get user by id from DB
      let user = await User.findByIdAndDelete(id).exec();

      //send not found if user not found
      if (!user) {
        req.flash("error", "User not found");
        return next(new ApiError(404, "User not found"));
      }

      //send response
      return res.status(201).json({
        success: true,
        user: user,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

//api for login user
router.post(
  "/login",
  async function (req: Request, res: Response, next: Function) {
    try {
      //get jason from body request
      const { username, password } = req.body;
      //verify body request
      if (!username || !password) {
        return next({
          status: 400,
          message: "Bad request",
          name: "user",
        });
      }
      //  get user from DB
      let user = await User.findOne({ username: username }).exec(
        (err: any, user: any) => {
          if (err) {
            return next(
              new ApiError(500, "internal server error , " + err.message)
            );
          }
          if (!user) {
            return next(new ApiError(404, "User not found"));
          }
          //verify password
          if (user.checkPassword(password)) {
            return next(new ApiError(401, "Password incorrect"));
          }
          //send response
          return res.status(200).json({
            success: true,
            data: user.toAuthJSON(),
          });
        }
      );
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
);

export default router;
