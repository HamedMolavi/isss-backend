"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = __importDefault(require("../models/user"));
const passport_1 = __importDefault(require("passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
;
//create router for add to server 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new user
router.post("/user", function (req, res, next) {
    //get jason from body request
    const { username, password, name, email, role } = req.body;
    let newUser = new user_1.default();
    //query for save new user in DB
    user_1.default.findOne({ username: username }, function (err, user) {
        if (err) {
            return next(err);
        }
        if (user) {
            req.flash("error", "User already exists");
            return res.status(201).json({ message: "User already exists" });
        }
        newUser = new user_1.default({
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
router.get("/:username", function (req, res, next) {
    //get token from header request
    const bearerHeader = req.headers.authorization;
    let bearerToken;
    if (bearerHeader) {
        bearerToken = bearerHeader.split(' ')[1];
        //query for get user by username from DB
        user_1.default.findOne({ username: req.params.username }, function (err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return next(new Error("Not Found"));
            }
            //check token with user
            jsonwebtoken_1.default.verify(bearerToken, user.token, () => {
                if (err) {
                    return res.json({ message: "Not Authorized" });
                }
                return res.status(200).json({
                    message: 'Success',
                    user: user
                });
            });
        });
    }
    else {
        next(new Error("Not Authorized"));
    }
});
//add route for edit user
router.put("/:id", function (req, res, next) {
    let id = req.params.id;
    // const { username, password, name, email, role } = req.body;
    const userBody = req.body;
    //get token from header request
    const bearerHeader = req.headers.authorization;
    let bearerToken;
    if (bearerHeader) {
        bearerToken = bearerHeader.split(' ')[1];
        //query for get user by username from DB
        user_1.default.findOne({ id: id }, function (err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return next(new Error("Not Found"));
            }
            //check token with user
            jsonwebtoken_1.default.verify(bearerToken, user.token, () => {
                var _a, _b, _c, _d, _e;
                if (err) {
                    return res.json({ message: "Not Authorized" });
                }
                let updateUser = new user_1.default({
                    id: id,
                    name: (_a = userBody.name) !== null && _a !== void 0 ? _a : user.name,
                    email: (_b = userBody.email) !== null && _b !== void 0 ? _b : user.email,
                    username: (_c = userBody.username) !== null && _c !== void 0 ? _c : user.username,
                    password: (_d = userBody.password) !== null && _d !== void 0 ? _d : user.User.password,
                    role: (_e = userBody.role) !== null && _e !== void 0 ? _e : user.role,
                    token: user.token
                });
                updateUser.set(next);
                return res.status(201).json({
                    message: 'User Edited',
                    user: updateUser
                });
            });
        });
    }
    else {
        next(new Error("Not Authorized"));
    }
});
//add route for delete user
router.delete("/:id", function (req, res, next) {
    let id = req.params.id;
    //get token from header request
    const bearerHeader = req.headers.authorization;
    let bearerToken;
    if (bearerHeader) {
        bearerToken = bearerHeader.split(' ')[1];
        //query for get user by username from DB
        user_1.default.findOne({ id: id }, function (err, user) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return next(new Error("Not Found"));
            }
            //check token with user
            jsonwebtoken_1.default.verify(bearerToken, user.token, () => {
                if (err) {
                    return res.json({ message: "Not Authorized" });
                }
                user.delete(next);
                return res.status(201).json({
                    message: 'User Deleted',
                    user: {}
                });
            });
        });
    }
    else {
        next(new Error("Not Authorized"));
    }
});
router.post("/login", passport_1.default.authenticate("login", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    }
    else {
        req.flash("info", "You must be logged in to see this page.");
        res.redirect("/login");
    }
}
exports.default = router;
