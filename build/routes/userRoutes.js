"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = __importDefault(require("../models/user"));
const authentication_1 = require("../tools/authentication");
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
    return __awaiter(this, void 0, void 0, function* () {
        //get jason from body request
        const { username, password, name, email, role } = req.body;
        //get token from header request
        let token = (0, authentication_1.getToken)(req, next);
        //verify token
        let critential = (0, authentication_1.authorize)(token);
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" });
        }
        else if (critential.role !== "admin") {
            return next({ status: 401, message: "Unauthorized" });
        }
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
            // newUser.password = await User.setPassword(password);
            //save new user in DB
            newUser.save(next);
            //send response to client with new user 
            return res.status(201).json({
                message: 'User created',
                user: newUser
            });
        });
    });
});
//route for get user by username from DB 
router.get("/:username", function (req, res, next) {
    //get token from header request
    let token = (0, authentication_1.getToken)(req, next);
    //verify token
    let critential = (0, authentication_1.authorize)(token);
    //check time expire token and role
    if (critential.exp < Date.now() / 1000) {
        return next({ status: 401, message: "Token expired" });
    }
    else if (critential.role !== "admin") {
        return next({ status: 401, message: "Unauthorized" });
    }
    //query for get user by username from DB
    user_1.default.findOne({ username: req.params.username }, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(new Error("Not Found"));
        }
        //send response to client with user    
        return res.status(200).json({
            message: 'Success',
            user: user
        });
    });
});
//add route for edit user
router.put("/:id", function (req, res, next) {
    //get id from url
    let id = req.params.id;
    // const { username, password, name, email, role } = req.body;
    const userBody = req.body;
    //get token from header request
    let token = (0, authentication_1.getToken)(req, next);
    //verify token
    let critential = (0, authentication_1.authorize)(token);
    //check time expire token and role
    if (critential.exp < Date.now() / 1000) {
        return next({ status: 401, message: "Token expired" });
    }
    else if (critential.role !== "admin") {
        return next({ status: 401, message: "Unauthorized" });
    }
    //query for get user by username from DB
    user_1.default.findById(id, function (err, user) {
        var _a, _b, _c, _d, _e;
        if (err) {
            return next(err);
        }
        if (!user) {
            return next({ status: 401, message: "Not Found" });
        }
        ;
        //check token with user
        let updateUser = new user_1.default({
            id: id,
            name: (_a = userBody.name) !== null && _a !== void 0 ? _a : user.name,
            email: (_b = userBody.email) !== null && _b !== void 0 ? _b : user.email,
            username: (_c = userBody.username) !== null && _c !== void 0 ? _c : user.username,
            password: (_d = userBody.password) !== null && _d !== void 0 ? _d : user.password,
            role: (_e = userBody.role) !== null && _e !== void 0 ? _e : user.role
        });
        //save edit user in DB
        updateUser.set(next);
        //return response with message and user
        return res.status(201).json({
            message: 'User Edited',
            user: updateUser
        });
    });
});
//add route for delete user
router.delete("/:id", function (req, res, next) {
    let id = req.params.id;
    //get token from header request
    let token = (0, authentication_1.getToken)(req, next);
    //verify token
    let critential = (0, authentication_1.authorize)(token);
    //check time expire token and role
    if (critential.exp < Date.now() / 1000) {
        return next({ status: 401, message: "Token expired" });
    }
    else if (critential.role !== "admin") {
        return next({ status: 401, message: "Unauthorized" });
    }
    //query for get user by username from DB
    user_1.default.findById(id, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(new Error("Not Found"));
        }
        //check token with user
        user.delete(next);
        //return response with message 
        return res.status(201).json({
            message: 'User Deleted',
            user: {}
        });
    });
});
router.post("/login", function (req, res, next) {
    //get jason from body request
    const { username, password } = req.body;
    user_1.default.findOne({ username: username }, function (err, user) {
        if (err) {
            return next(err);
        }
        ;
        if (!user) {
            return next(new Error("No user has that username!"));
        }
        user.checkPassword(password, function (err, isMatch) {
            console.log(isMatch);
            if (err) {
                return next(err);
            }
            if (isMatch) {
                return res.status(200).json({
                    message: 'Success',
                    user: user
                });
            }
            else {
                return next(null, false, { message: "Invalid password." });
            }
        });
    });
});
exports.default = router;
