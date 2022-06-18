import { Router, Request, Response, NextFunction } from 'express';
import HttpException from '../../error/HttpException';
import User, { IUser } from '../../models/user';
import { getTokenAndVerify } from "../../tools/authentication";

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
router.post("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { username, password, phone_number }: IUser = req.body;

        //verify body request
        if (!username || !password || !phone_number) {
            req.flash("error", "Please enter all fields");
            return next(new HttpException(400, "Please enter all fields", "User"));
        }
        //get token from header request and verify
        let token = getTokenAndVerify(req, "admin", next);

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
            return next(new HttpException(400, "User already exists", "User"));
        }

        //set data for new user
        let newUser = new User();
        newUser.username = username;
        newUser.password = password;
        newUser.phone_number = phone_number;
        newUser.role = "admin";

        //save new user in DB
        await newUser.save();
        req.flash("info", "User created");
        //send response
        return res.status(201).json({
            message: 'Success',
            user: newUser
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "User"));
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
        //get token from header request and verify
        let token = getTokenAndVerify(req, "admin", next);
        //query for get user by username from DB
        let users: IUser[] = [];
        if (!(search && search.length > 0)) {
            users = await User.find({
                name: { $regex: search, $options: "i" }
            }).limit(perPage).skip(perPage * (page - 1)).exec();
        } else {
            users = await User.find().limit(perPage).skip(perPage * (page - 1)).exec();
        }

        //send not found if user not found
        if (!users) {
            req.flash("error", "User not found");
            return next(new HttpException(404, "User not found", "User"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "User"));
    }

});


//route for get user by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Please enter id");
            return next(new HttpException(400, "Please enter id", "User"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "admin", next);

        //query for get user by id from DB
        let user = await User.findById(id).exec();

        //send not found if user not found
        if (!user) {
            req.flash("error", "User not found");
            return next(new HttpException(404, "User not found", "User"));
        }

        //send response
        return res.status(200).json({
            message: 'Success',
            user: user
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "User"));
    }

});

//add route for edit user
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id as string;
        if (!id) {
            req.flash("error", "Please enter id");
            return next(new HttpException(400, "Please enter id", "User"));
        }
        //get jason from body request
        const userBody = req.body;
        //get token from header request and verify
        let token = getTokenAndVerify(req, "admin", next);
        //query for get user by username from DB
        let user = await User.findByIdAndUpdate(id, userBody, { new: true }).exec();

        //send not found if user not found
        if (!user) {
            req.flash("error", "User not found");
            return next(new HttpException(404, "User not found", "User"));
        }

        //send response 
        return res.status(201).json({
            message: 'Success',
            user: user
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "User"));
    }

});


//add route for delete user
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id;
        if (!id) {
            req.flash("error", "Please enter id");
            return next(new HttpException(400, "Please enter id", "User"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "admin", next);

        //query for get user by id from DB
        let user = await User.findByIdAndDelete(id).exec();

        //send not found if user not found
        if (!user) {
            req.flash("error", "User not found");
            return next(new HttpException(404, "User not found", "User"));
        }

        //send response
        return res.status(201).json({
            message: 'Success',
            user: user
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "User"));
    }

});

//api for login user
router.post("/login", async function (req: Request, res: Response, next: Function) {
    try {
        //get jason from body request
        const { username, password } = req.body;
        //verify body request
        if (!username || !password) {
            return next({
                status: 400,
                message: "Bad request",
                name: "user"
            });
        }
        console.log(username, password);
        //  get user from DB
        User.findOne({ username: username }, function (err: Error, user: any) {
            if (err) { return next(err) };
            if (!user) {
                return next(new HttpException(404, "User not found", "User"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "User"));
    }

});

export default router;