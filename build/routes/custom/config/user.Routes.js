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
const error_handler_1 = require("../../../error/error.handler");
const user_1 = __importDefault(require("../../../models/user"));
const authentication_1 = require("../../../tools/authentication");
const verifyPasswordRegex_1 = require("../../../tools/verifyPasswordRegex");
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
            const { username, password, phone_number, event, camera, report, configuration, } = req.body;
            //verify body request
            if (!username || !password || !phone_number) {
                req.flash("error", "Please enter all fields");
                return next(new error_handler_1.ApiError(400, "Please enter all fields"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
            //verify password
            let resultVerifyPassword = (0, verifyPasswordRegex_1.getStrength)(password);
            if (resultVerifyPassword < 99) {
                req.flash("error", "Password is not strong enough");
                return next(new error_handler_1.ApiError(400, "Password is not strong enough"));
            }
            //query for save new user in DB
            let user = yield user_1.default.findOne({
                $or: [{ username: username }, { phone_number: phone_number }],
            }).exec();
            //check user in DB
            if (user) {
                req.flash("error", "User already exists");
                return next(new error_handler_1.ApiError(400, "User already exists"));
            }
            //set data for new user
            let newUser = new user_1.default();
            newUser.username = username;
            newUser.password = password;
            newUser.phone_number = phone_number;
            newUser.role = "admin";
            newUser.event = event;
            newUser.camera = camera;
            newUser.report = report;
            newUser.configuration = configuration;
            //save new user in DB
            yield newUser.save();
            req.flash("info", "User created");
            //send response
            return res.status(201).json({
                success: true,
                data: newUser.toJSON(),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
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
                    name: { $regex: search, $options: "i" },
                })
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            else {
                users = yield user_1.default.find()
                    .limit(perPage)
                    .skip(perPage * (page - 1))
                    .exec();
            }
            //send not found if user not found
            if (!users) {
                req.flash("error", "User not found");
                return next(new error_handler_1.ApiError(404, "User not found"));
            }
            //send response
            return res.status(200).json({
                success: true,
                data: users,
                page: page,
                perPage: perPage,
                total: yield user_1.default.countDocuments().exec(),
                pages: Math.ceil((yield user_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
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
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
            //query for get user by id from DB
            let user = yield user_1.default.findById(id).exec();
            //send not found if user not found
            if (!user) {
                req.flash("error", "User not found");
                return next(new error_handler_1.ApiError(404, "User not found"));
            }
            //send response
            return res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
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
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            //get jason from body request
            const userBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
            //query for get user by username from DB
            let user = yield user_1.default.findByIdAndUpdate(id, userBody, {
                new: true,
            }).exec();
            //send not found if user not found
            if (!user) {
                req.flash("error", "User not found");
                return next(new error_handler_1.ApiError(404, "User not found"));
            }
            //send response
            return res.status(201).json({
                success: true,
                data: user,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
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
                return next(new error_handler_1.ApiError(400, "Please enter id"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "admin", next);
            //query for get user by id from DB
            let user = yield user_1.default.findByIdAndDelete(id).exec();
            //send not found if user not found
            if (!user) {
                req.flash("error", "User not found");
                return next(new error_handler_1.ApiError(404, "User not found"));
            }
            //send response
            return res.status(201).json({
                success: true,
                user: user,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
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
                    name: "user",
                });
            }
            //  get user from DB
            let user = yield user_1.default.findOne({ username: username }).exec((err, user) => {
                if (err) {
                    return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
                }
                if (!user) {
                    return next(new error_handler_1.ApiError(404, "User not found"));
                }
                //verify password
                if (user.checkPassword(password)) {
                    return next(new error_handler_1.ApiError(401, "Password incorrect"));
                }
                //send response
                return res.status(200).json({
                    success: true,
                    data: user.toAuthJSON(),
                });
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
exports.default = router;
