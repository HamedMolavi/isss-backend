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
            const { username, password, phone_number } = req.body;
            //verify body request
            if (!username || !password || !phone_number) {
                req.flash("error", "Please enter all fields");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            else if (critential.role !== "admin") {
                req.flash("error", "You are not admin");
                return next({ status: 401, message: "Unauthorized" });
            }
            //query for save new user in DB
            let user = yield user_1.default.findOne({
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
            let newUser = new user_1.default();
            newUser.username = username;
            newUser.password = password;
            newUser.phone_number = phone_number;
            newUser.role = "user";
            //save new user in DB
            yield newUser.save();
            req.flash("info", "User created");
            //send response
            return res.status(201).json({
                message: 'User created',
                user: newUser
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not create the user: ${err}` });
        }
    });
});
//route for get user with search from DB 
router.get("/find", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get param from url
            let search = req.query.search;
            let strLimit = req.query.limit;
            let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
            if (!search) {
                req.flash("error", "Please enter search");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for search user by id from DB
            let user = yield user_1.default.find({
                name: { $regex: search, $options: "i" }
            }).limit(limit).exec();
            //return response not found to client if not found user
            if (!user) {
                req.flash("error", "Section not found");
                return next(new Error("Not Found"));
            }
            //return response to client with user
            return res.status(200).json({
                message: "Success",
                user: user,
                limit: limit,
                total: yield user_1.default.countDocuments().exec()
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the user: ${err}` });
        }
    });
});
//route for get users list  
router.get("/list", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            else if (critential.role !== "admin") {
                req.flash("error", "You are not admin");
                return next({ status: 401, message: "Unauthorized" });
            }
            //query for get user by username from DB
            let users = yield user_1.default.find().limit(perPage).skip(perPage * (page - 1)).exec();
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
                total: yield user_1.default.countDocuments().exec(),
                pages: Math.ceil((yield user_1.default.countDocuments().exec()) / perPage)
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
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter id");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            else if (critential.role !== "admin") {
                req.flash("error", "You are not admin");
                return next({ status: 401, message: "Unauthorized" });
            }
            //query for get user by id from DB
            let user = yield user_1.default.findById(id).exec();
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
            if (!id) {
                req.flash("error", "Please enter id");
                return next({ status: 400, message: "Bad request" });
            }
            //get jason from body request
            const userBody = req.body;
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            else if (critential.role !== "admin") {
                req.flash("error", "You are not admin");
                return next({ status: 401, message: "Unauthorized" });
            }
            //query for get user by username from DB
            let user = yield user_1.default.findByIdAndUpdate(id, userBody, { new: true }).exec();
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
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter id");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "Token expired");
                return next({ status: 401, message: "Token expired" });
            }
            else if (critential.role !== "admin") {
                req.flash("error", "You are not admin");
                return next({ status: 401, message: "Unauthorized" });
            }
            //query for get user by id from DB
            let user = yield user_1.default.findByIdAndDelete(id).exec();
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
            //  get user from DB
            user_1.default.findOne({ username: username }, function (err, user) {
                if (err) {
                    return next(err);
                }
                ;
                if (!user) {
                    return next(new Error("No user has that username!"));
                }
                // verify password
                user.checkPassword(password, function (err, isMatch) {
                    if (err) {
                        return next(err);
                    }
                    if (isMatch) {
                        return res.status(200).json({
                            message: 'Success',
                            user: user.toAuthJSON()
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
