import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import User, { setPassword } from "../../db/mongo/models/user";
import { getStrength } from "../../tools/verifyPasswordRegex";
import { IUser } from "../../types/interfaces/user.interface";

//create router for add to server
const router: Router = Router();

//add route for register new user
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get json from body request
    const { username, password, phone_number, event, camera, report, configuration }: IUser = req.body;

    //verify body request
    if (!username || !password || !phone_number) {
      req.flash("error", "Please enter all fields");
      return next(new ApiError(400, "Please enter all fields"));
    };

    //verify password
    let resultVerifyPassword = getStrength(password);
    if (resultVerifyPassword < 99) {
      req.flash("error", "Password is not strong enough");
      return next(new ApiError(400, "Password is not strong enough"));
    };

    //query for save new user in DB
    let user = await User.findOne({
      $or: [{ username: username }, { phone_number: phone_number }],
    }).exec();

    //check user in DB
    if (user) {
      req.flash("error", "User already exists");
      return next(new ApiError(400, "User already exists"));
    };

    //set data for new user
    let newUser = new User();
    newUser.username = username;
    newUser.password = password;
    newUser.phone_number = phone_number;
    newUser.role = "user";
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
});

//route for get users list
router.get("", async function (req: Request, res: Response, next: NextFunction) {
  try {

    //get page from url
    let strPage = req.query.page as string;
    let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
    //get perPage from url
    let strPerPage = req.query.perPage as string;
    let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
    let search = req.query.search as string;
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
});

//route for get user by id from DB
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id;
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

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
});

//add route for edit user
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id as string;
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }
    let _user = await User.findById(id).exec();
    //get json from body request
    const userBody = req.body;


    if (_user && userBody.password) {
      let resultVerifyPassword = getStrength(userBody.password);
      if (resultVerifyPassword < 99) {
        req.flash("error", "Password is not strong enough");
        return next(new ApiError(400, "Password is not strong enough"));
      }
      userBody.password = await setPassword(userBody?.password, _user?.username);
    }

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
});

//add route for delete user
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id = req.params.id;
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

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
});

/*
router.patch("/reset-password/:id",accessCheck(Access.Configuration,"user"), async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id as string;
    if (!id) {
      req.flash("error", "Please enter id");
      return next(new ApiError(400, "Please enter id"));
    }

    //get json from body request
    let { current_password, new_password } = req.body;

    let _user = await User.findById(id).exec();

    if (_user && current_password && new_password) {
      let resultVerifyPassword = getStrength(new_password);
      let isMatch = await _user.checkPassword(current_password, (err: any, isMatch: any) => {
        if (err) {
          return next(new ApiError(500, "internal server error , " + err.message));
        }
        return isMatch;
      });
      if (!isMatch) {
        return next(new ApiError(401, "Password is incorrect"));
      }
      if (resultVerifyPassword < 99) {
        req.flash("error", "Password is not strong enough");
        return next(new ApiError(400, "Password is not strong enough"));
      }

      _user.password = await setPassword(new_password, _user?.username);

    }

    let user = await User.findByIdAndUpdate(id, _user, {
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
});
*/

export default router;
