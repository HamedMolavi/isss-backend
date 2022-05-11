import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/user';
import passport from 'passport';
import jwt from "jsonwebtoken";

interface IUser {
    name: string;
    username: string;
    password: string;
    email: string;
    role: string;
};

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
        newUser.token = newUser.generateJWT();
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
    const bearerHeader = req.headers.authorization;
    let bearerToken: string;
    if (bearerHeader) {
        bearerToken = bearerHeader.split(' ')[1];

        //query for get user by username from DB
        User.findOne({ username: req.params.username }, function (err: Error, user: any) {
            if (err) { return next(err); }
            if (!user) { return next(new Error("Not Found")); }
            //check token with user
            jwt.verify(bearerToken, user.token, () => {
                if (err) {
                    return res.json({ message: "Not Authorized" });
                }
                return res.status(200).json({
                    message: 'Success',
                    user: user
                });
            });
        });
    } else {
        next(new Error("Not Authorized"));
    }

});

//add route for edit user
router.put("/:id", function (req: any, res: any, next: NextFunction) {
    let id = req.params.id;
    // const { username, password, name, email, role } = req.body;
    const userBody = req.body;
    //get token from header request
    const bearerHeader = req.headers.authorization;
    let bearerToken: string;
    console.log(bearerHeader);
    if (bearerHeader) {
        bearerToken = bearerHeader.split(' ')[1];
        //query for get user by username from DB
        User.findOne({ id: id }, function (err: Error, user: any) {
            if (err) { return next(err); }
            if (!user) { return next(new Error("Not Found")); }
            //check token with user
            jwt.verify(bearerToken, user.token, () => {
                if (err) {
                    return res.json({ message: "Not Authorized" });
                }

                let updateUser = new User({
                    id : id,
                    name : userBody.name ?? user.name,
                    email : userBody.email ?? user.email,
                    username : userBody.username ?? user.username,
                    password : userBody.password ?? user.User.password,
                    role : userBody.role ?? user.role,
                    token : user.token
                });
                updateUser.set(next);
                return res.status(201).json({
                    message: 'User Edited',
                    user: updateUser
                });
            });
        });
    } else {
        next(new Error("Not Authorized"));
    }
});

router.post("/login", passport.authenticate("login", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.flash("info", "You must be logged in to see this page.");
        res.redirect("/login");
    }
}


export default router;