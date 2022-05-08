import { Router, Request, Response, NextFunction } from 'express';
import User from '../models/user';
import passport from 'passport';

enum roles {
    admin = 1,
    user = 2
}

interface IUser {
    name: string;
    username: string;
    password: string;
    email: string;
    role: roles;
};

const router: Router = Router();

router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});

router.post("/signup", function (req: Request, res: Response, next: NextFunction) {
    let username: string = req.body.username;
    let password: string = req.body.password;
    let name: string = req.body.name;
    let email: string = req.body.email;
    let role: string = req.body.role;

  //  const { user } = req.body;

    let newUser = new User();

    User.findOne({ username: username }, function (err: Error, user: IUser) {
        if (err) { return next(err); }
        if (user) {
            req.flash("error", "User already exists");
            return res.json({ message: "User already exists" });
        }

        newUser = new User({
            username: username,
            password: password,
            name: name,
            email: email,
            roles : role
        });
        newUser.save(next);
        res.json({ user: newUser.toAuthJSON() })
    });
    // passport.authenticate("login", () => {
    //     res.json({ user: newUser.toAuthJSON() })
    // });
});

router.get("/users/:username", function (req: Request, res: Response, next: NextFunction) {
    User.findOne({ username: req.params.username }, function (err: Error, user: any) {
        if (err) { return next(err); }
        if (!user) { return next(404); }
        res.render("profile", { user: user });
    });
});

router.post("/login", passport.authenticate("login", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));

router.get("/logout", function (req: Request, res: Response) {
    req.logOut();
    res.redirect("/");
});

function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.flash("info", "You must be logged in to see this page.");
        res.redirect("/login");
    }
}

router.put("/edit", ensureAuthenticated, function (req: any, res: any, next: NextFunction) {
    req.user.displayName = req.body.displayname;
    req.user.bio = req.body.bio;
    req.user!.save(function (err: Error) {
        if (err) {
            next(err);
            return;
        }
        req.flash("info", "Profile updated!");
        res.redirect("/edit");
    });
})


export default router;