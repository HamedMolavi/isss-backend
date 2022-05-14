import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/user';
import passport from 'passport';
import { authorize, getToken } from "../tools/authentication";

interface IUser {
    name: string;
    username: string;
    password: string;
    email: string;
    role: string;
};

interface ICritential {

    id: string;
    email: string;
    role: string;
    exp: number;
    iat: number;

}


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
router.post("/user", function (req: Request, res: Response, next: NextFunction) {
    //get jason from body request
    const { username, password, name, email, role } = req.body;

    //get token from header request
    let token: string = getToken(req, next) as string;

    //verify token
    let critential: ICritential = authorize(token) as ICritential;

    //check time expire token and role
    if (critential.exp < Date.now() / 1000) {
        return next({ status: 401, message: "Token expired" });
    } else if (critential.role !== "admin") {
        return next({ status: 401, message: "Unauthorized" });
    }

    let newUser = new User();
    //query for save new user in DB
    User.findOne({ username: username }, function (err: Error, user: IUser) {
        if (err) { return next(err); }
        if (user) {
            req.flash("error", "User already exists");
            return res.status(201).json({ message: "User already exists" });
        }

        newUser = new User({
            username: username,
            password: password,
            name: name,
            email: email,
            role: role
        });
        //genrate token for new user
        //  newUser.token = newUser.toAuthJSON();
        //save new user in DB
        newUser.save(next);
        return res.status(201).json({
            message: 'User created',
            user: newUser
        });
    });
});

//route for get user by username from DB 
router.get("/:username", function (req: Request, res: Response, next: NextFunction) {
    //get token from header request
    let token = getToken(req, next) as string;

    //verify token
    let critential = authorize(token) as any;
    //check time expire token and role
    if (critential.exp < Date.now() / 1000) {
        return next({ status: 401, message: "Token expired" })
    } else if (critential.role !== "admin") {
        return next({ status: 401, message: "Unauthorized" });
    }

    //query for get user by username from DB
    User.findOne({ username: req.params.username }, function (err: Error, user: any) {
        if (err) { return next(err); }
        if (!user) { return next(new Error("Not Found")); }
        //check token with user     
        return res.status(200).json({
            message: 'Success',
            user: user
        });
    });
});

//add route for edit user
router.put("/:id", function (req: any, res: any, next: NextFunction) {
    let id = req.params.id;
    // const { username, password, name, email, role } = req.body;
    const userBody = req.body;
    //get token from header request
    let token = getToken(req, next) as string;

    //verify token
    let critential = authorize(token) as any;

    //check time expire token and role
    if (critential.exp < Date.now() / 1000) {
        return next({ status: 401, message: "Token expired" })
    } else if (critential.role !== "admin") {
        return next({ status: 401, message: "Unauthorized" });
    }
    //query for get user by username from DB
    User.findOne({ id: id }, function (err: Error, user: any) {
        if (err) { return next(err); }
        if (!user) { return next(new Error("Not Found")); }
        //check token with user
        let updateUser = new User({
            id: id,
            name: userBody.name ?? user.name,
            email: userBody.email ?? user.email,
            username: userBody.username ?? user.username,
            password: userBody.password ?? user.User.password,
            role: userBody.role ?? user.role
        });
        updateUser.set(next);
        return res.status(201).json({
            message: 'User Edited',
            user: updateUser
        });
    });
});


//add route for delete user
router.delete("/:id", function (req: any, res: any, next: NextFunction) {
    let id = req.params.id;

    //get token from header request
    let token = getToken(req, next) as string;

    let critential = authorize(token) as any;

    if (critential.role == "admin") {
        return next({ message: "Unauthorized" });
    }

    //query for get user by username from DB
    User.findOne({ id: id }, function (err: Error, user: any) {
        if (err) { return next(err); }
        if (!user) { return next(new Error("Not Found")); }
        //check token with user
        user.delete(next);
        return res.status(201).json({
            message: 'User Deleted',
            user: {}
        });
    });
});

router.post("/login", function (req: Request, res: Response, next: NextFunction) {

    //get jason from body request
    const { username, password } = req.body;

    //query for save new user in DB
    User.findOne({ username: username }, function (err: Error, user: any) {
        if (err) { return next(err); }
        if (!user) {
            req.flash("error", "In");
            return res.status(201).json({ message: "Not Found" });
        }

        user.checkPassword(password, function (err: Error, isMatch: boolean) {
            if (err) { return next(err); }
            if (!isMatch) {
                req.flash("error", "In");
                return res.status(201).json({ message: "Incorrect password" });
            }
            return res.status(201).json({
                message: 'Success',
                user: user.toAuthJSON()
            });
        });
    });
});


export default router;