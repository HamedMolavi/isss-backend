import { Router, Request, Response, NextFunction } from 'express';
import User, { IUser } from '../../models/user';
import { authorize, getToken, ICritential } from "../../tools/authentication";


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
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { username, password, phone_number }: IUser = req.body;

        //verify body request
        if (!username || !password || !phone_number) {
            req.flash("error", "Please enter all fields");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" });
        } else if (critential.role !== "admin") {
            req.flash("error", "You are not admin");
            return next({ status: 401, message: "Unauthorized" });
        }

        //query for save new user in DB
        let user = await User.findOne({
            $or: [
                { username: username },
                { phone_number: phone_number }
            ]
        }).exec();

        //check user in DB
        if (user) {
            req.flash("error", "User already exists");
            return next({ status: 400, message: "User already exists" });
        }

        //set data for new user
        let newUser = new User();
        newUser.username = username;
        newUser.password = password;
        newUser.phone_number = phone_number;
        newUser.role = "user";

        //save new user in DB
        await newUser.save();
        req.flash("info", "User created");
        //send response
        return res.status(201).json({
            message: 'User created',
            user: newUser
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the user: ${err}` });
    }
});

//route for get user with search from DB 
router.get("/find", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get param from url
        let search = req.query.search as string;
        let strLimit = req.query.limit as string;
        let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
        if (!search) {
            req.flash("error", "Please enter search");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for search user by id from DB
        let user = await User.find({
            name: { $regex: search, $options: "i" }
        }).limit(limit).exec();

        //return response not found to client if not found user
        if (!user) {
            req.flash("error", "User not found");
            return next({ status: 404, message: "User not found" });
        }
        //return response to client with user
        return res.status(200).json({
            message: "Success",
            user: user,
            limit: limit,
            total: await User.countDocuments().exec()
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the user: ${err}` });
    }
});


//route for get users list  
router.get("/list", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        } else if (critential.role !== "admin") {
            req.flash("error", "You are not admin");
            return next({ status: 401, message: "Unauthorized" });
        }
        //query for get user by username from DB
        let users = await User.find().limit(perPage).skip(perPage * (page - 1)).exec();

        //send not found if user not found
        if (!users) {
            req.flash("error", "User not found");
            return next({ status: 404, message: "Not Found" });
        }
        //send response
        return res.status(200).json({
            message: 'Success',
            users: users,
            page: page,
            perPage: perPage,
            total: await User.countDocuments().exec(),
            pages: Math.ceil(await User.countDocuments().exec() / perPage)
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the user: ${err}` });
    }

});


//route for get user by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Please enter id");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        } else if (critential.role !== "admin") {
            req.flash("error", "You are not admin");
            return next({ status: 401, message: "Unauthorized" });
        }

        //query for get user by id from DB
        let user = await User.findById(id).exec();

        //send not found if user not found
        if (!user) {
            req.flash("error", "User not found");
            return next({ status: 404, message: "Not Found" });
        }

        //send response
        return res.status(200).json({
            message: 'Success',
            user: user
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the user: ${err}` });
    }

});

//add route for edit user
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id as string;
        if (!id) {
            req.flash("error", "Please enter id");
            return next({ status: 400, message: "Bad request" });
        }
        //get jason from body request
        const userBody = req.body;
        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        } else if (critential.role !== "admin") {
            req.flash("error", "You are not admin");
            return next({ status: 401, message: "Unauthorized" });
        }
        //query for get user by username from DB
        let user = await User.findByIdAndUpdate(id, userBody, { new: true }).exec();

        //send not found if user not found
        if (!user) {
            req.flash("error", "User not found");
            return next({ status: 404, message: "Not Found" });
        }

        //send response 
        return res.status(201).json({
            message: 'Success',
            user: user
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the user: ${err}` });
    }

});


//add route for delete user
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id;
        if (!id) {
            req.flash("error", "Please enter id");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        } else if (critential.role !== "admin") {
            req.flash("error", "You are not admin");
            return next({ status: 401, message: "Unauthorized" });
        }

        //query for get user by id from DB
        let user = await User.findByIdAndDelete(id).exec();

        //send not found if user not found
        if (!user) {
            req.flash("error", "User not found");
            return next({ status: 404, message: "Not Found" });
        }

        //send response
        return res.status(201).json({
            message: 'Success',
            user: user
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the user: ${err}` });
    }

});

//api for login user
router.post("/login", async function (req: Request, res: Response, next: Function) {
    try {
        //get jason from body request
        const { username, password } = req.body;
        //verify body request
        if (!username || !password) {
            return next({ status: 400, message: "Bad request" });
        }
        //  get user from DB
        User.findOne({ username: username }, function (err: Error, user: any) {
            if (err) { return next(err) };
            if (!user) {
                return next({ status: 404, message: "User not found" });
            }
            // verify password
            user.checkPassword(password, function (err: Error, isMatch: Function) {
                if (err) { return next(err); }
                if (isMatch) {
                    return res.status(200).json({
                        message: 'Success',
                        user: user.toAuthJSON()
                    });
                } else {
                    return next(null, false, { message: "Invalid password." });
                }
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not login: ${err}` });
    }

});

export default router;