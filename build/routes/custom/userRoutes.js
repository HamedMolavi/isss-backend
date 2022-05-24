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
const user_1 = __importDefault(require("../../models/user"));
const authentication_1 = require("../../tools/authentication");
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
router.post("/register", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { username, password, name, email, role } = req.body;
            //verify body request
            if (!username || !password || !name || !email || !role) {
                return next({ status: 400, message: "Bad request" });
            }
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
                return __awaiter(this, void 0, void 0, function* () {
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
                    yield newUser.save(next);
                    //send response to client with new user 
                    return res.status(201).json({
                        message: 'User created',
                        user: newUser
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the user: ${err}` });
        }
    });
});
//route for get users list  
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
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
            user_1.default.find({}, function (err, users) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return next(err);
                    }
                    if (!users) {
                        return next(new Error("Not Found"));
                    }
                    //send response to client with user    
                    return res.status(200).json({
                        message: 'Success',
                        users: users
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the user: ${err}` });
        }
    });
});
//route for get user by id from DB 
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
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
            //query for get user by id from DB
            user_1.default.findById(id, function (err, user) {
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
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the user: ${err}` });
        }
    });
});
//add route for edit user
router.put("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
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
            user_1.default.findByIdAndUpdate(id, { $set: userBody }, function (err, user) {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    return next(new Error("Not Found"));
                }
                user_1.default.findById(id, function (err, updateUser) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (err) {
                            return next(err);
                        }
                        //send response to client with section
                        return res.status(201).json({
                            message: 'Success',
                            user: updateUser
                        });
                    });
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not edit the user: ${err}` });
        }
    });
});
//add route for delete user
router.delete("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = req.params.id;
            //verify body request
            if (!id) {
                return next({ status: 400, message: "Bad request" });
            }
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
            //query for get user by id from DB
            user_1.default.findByIdAndDelete(id, function (err, user) {
                if (err) {
                    return next(err);
                }
                if (!user) {
                    return next(new Error("Not Found"));
                }
                //send response to client with user
                return res.status(201).json({
                    message: 'Success',
                    user: user
                });
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not delete the user: ${err}` });
        }
    });
});
//api for login user
router.post("/login", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { username, password } = req.body;
            //verify body request
            if (!username || !password) {
                return next({ status: 400, message: "Bad request" });
            }
            //get user from DB
            user_1.default.findOne({ username: username }, function (err, user) {
                if (err) {
                    return next(err);
                }
                ;
                if (!user) {
                    return next(new Error("No user has that username!"));
                }
                //verify password
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
        }
        catch (err) {
            return next({ status: 500, message: `Could not login: ${err}` });
        }
    });
});
exports.default = router;
