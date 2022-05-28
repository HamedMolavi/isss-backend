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
            return next({ status: 200, message: "User already exists" });
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

//route for get users list  
router.get("/list/:page", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page number from url
        let page: number = parseInt(req.params.page as string) > 0 ? parseInt(req.params.page as string) : 1;
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
        const perPage: number = 5;
        //query for get user by username from DB
        let users = await User.find({}).skip((page - 1) * perPage).limit(perPage).exec();

        //send not found if user not found
        if (!users) {
            req.flash("error", "User not found");
            return next({ status: 200, message: "Not Found" });
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
            return next({ status: 200, message: "Not Found" });
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
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
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
            return next({ status: 200, message: "Not Found" });
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
            return next({ status: 200, message: "Not Found" });
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
                return next(new Error("No user has that username!"));
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