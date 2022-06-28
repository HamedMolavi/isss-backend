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
const HttpException_1 = __importDefault(require("../../error/HttpException"));
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
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const { username, password, phone_number } = req.body;
            //verify body request
            if (!username || !password || !phone_number) {
                req.flash("error", "Please enter all fields");
                return next(new HttpException_1.default(400, "Please enter all fields", "User"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
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
                return next(new HttpException_1.default(400, "User already exists", "User"));
            }
            //set data for new user
            let newUser = new user_1.default();
            newUser.username = username;
            newUser.password = password;
            newUser.phone_number = phone_number;
            newUser.role = "admin";
            //save new user in DB
            yield newUser.save();
            req.flash("info", "User created");
            //send response
            return res.status(201).json({
                message: 'Success',
                user: newUser
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "User"));
        }
    });
});
//route for get users list  
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            let search = req.query.search;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
            //query for get user by username from DB
            let users = [];
            if (!(search && search.length > 0)) {
                users = yield user_1.default.find({
                    name: { $regex: search, $options: "i" }
                }).limit(perPage).skip(perPage * (page - 1)).exec();
            }
            else {
                users = yield user_1.default.find().limit(perPage).skip(perPage * (page - 1)).exec();
            }
            //send not found if user not found
            if (!users) {
                req.flash("error", "User not found");
                return next(new HttpException_1.default(404, "User not found", "User"));
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
            return next(new HttpException_1.default(500, err.message, "User"));
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
                return next(new HttpException_1.default(400, "Please enter id", "User"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
            //query for get user by id from DB
            let user = yield user_1.default.findById(id).exec();
            //send not found if user not found
            if (!user) {
                req.flash("error", "User not found");
                return next(new HttpException_1.default(404, "User not found", "User"));
            }
            //send response
            return res.status(200).json({
                message: 'Success',
                user: user
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "User"));
        }
    });
});
//add route for edit user
router.patch("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter id");
                return next(new HttpException_1.default(400, "Please enter id", "User"));
            }
            //get jason from body request
            const userBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
            //query for get user by username from DB
            let user = yield user_1.default.findByIdAndUpdate(id, userBody, { new: true }).exec();
            //send not found if user not found
            if (!user) {
                req.flash("error", "User not found");
                return next(new HttpException_1.default(404, "User not found", "User"));
            }
            //send response 
            return res.status(201).json({
                message: 'Success',
                user: user
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "User"));
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
                return next(new HttpException_1.default(400, "Please enter id", "User"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
            //query for get user by id from DB
            let user = yield user_1.default.findByIdAndDelete(id).exec();
            //send not found if user not found
            if (!user) {
                req.flash("error", "User not found");
                return next(new HttpException_1.default(404, "User not found", "User"));
            }
            //send response
            return res.status(201).json({
                message: 'Success',
                user: user
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "User"));
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
                return next({
                    status: 400,
                    message: "Bad request",
                    name: "user"
                });
            }
            //  get user from DB
            user_1.default.findOne({ username: username }, function (err, user) {
                if (err) {
                    return next(err);
                }
                ;
                if (!user) {
                    return next(new HttpException_1.default(404, "User not found", "User"));
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
            return next(new HttpException_1.default(500, err.message, "User"));
        }
    });
});
exports.default = router;
