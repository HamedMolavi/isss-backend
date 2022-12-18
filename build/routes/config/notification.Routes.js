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
const error_handler_1 = require("../../error/error.handler");
const notification_1 = __importDefault(require("../../models/notification"));
const authentication_1 = require("./../../tools/authentication");
//get user role from enviroment variable
const const_role = process.env.const_role || "user";
//create router for add to routes file
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//add route for register new notification
router.post("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get jason from body request
            const newNotif = req.body;
            //verify body request
            if (!newNotif.phone_number && !newNotif.email) {
                req.flash("error", "Please enter phone number or email");
                return next(new error_handler_1.ApiError(400, "Please enter phone number or email"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for save new notification in DB
            //check if notification exist
            let notification = yield notification_1.default.findOne({
                $and: [
                    { cameras: newNotif.cameras },
                    {
                        $or: [{ phone_number: { $in: newNotif.phone_number } }, { emails: { $in: newNotif.phone_number } }],
                    },
                ],
            }).exec();
            //check if notification exist
            if (notification) {
                req.flash("error", "Notification already exist");
                return next(new error_handler_1.ApiError(400, "Notification already exist"));
            }
            //set notification data
            let _newNotification = new notification_1.default(newNotif);
            //_newNotification = newNotif;
            //save notification in DB
            yield _newNotification.save();
            req.flash("info", "notification has been registered");
            //send response
            return res.status(201).json({
                success: true,
                data: _newNotification,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error" + err.message));
        }
    });
});
//route for get notifications list
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.perPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get notifications from DB
            let notifications = yield notification_1.default.find({})
                // .populate("cameras")
                // .populate("types")
                .limit(perPage)
                .skip(perPage * (page - 1))
                .exec();
            //return not found if notifications not exist
            if (!notifications) {
                req.flash("error", "Notifications not found");
                return next(new error_handler_1.ApiError(404, "Notifications not found"));
            }
            //send response
            return res.status(200).json({
                success: true,
                data: notifications,
                page: page,
                perPage: perPage,
                total: yield notification_1.default.countDocuments().exec(),
                pages: Math.ceil((yield notification_1.default.countDocuments().exec()) / perPage),
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
//route for get notification by id from DB
router.get("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter specifies notification id");
                return next(new error_handler_1.ApiError(400, "Please enter specifies notification id"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get notification by id from DB
            let notification = yield notification_1.default.findById(id).exec();
            //return not found if notification not exist
            if (!notification) {
                req.flash("error", "Notification not found");
                return next(new error_handler_1.ApiError(404, "Notification not found"));
            }
            //send response
            return res.status(200).json({
                success: true,
                data: notification,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
//add route for edit notification
router.patch("/:id", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let id = req.params.id;
            if (!id) {
                req.flash("error", "Please enter specifies notification id");
                return next(new error_handler_1.ApiError(400, "Please enter specifies notification id"));
            }
            //get jason from body request
            const notificationBody = req.body;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get notification by id from DB
            let notification = yield notification_1.default.findByIdAndUpdate(id, notificationBody, {
                new: true,
            }).exec();
            //return not found if notification not exist
            if (!notification) {
                req.flash("error", "Notification not found");
                return next(new error_handler_1.ApiError(404, "Notification not found"));
            }
            //send response
            return res.status(201).json({
                message: "Success",
                section: notification,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
//add route for delete notification
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
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            //query for get notification by id from DB
            let notification = yield notification_1.default.findByIdAndDelete(id).exec();
            //return not found if notification not exist
            if (!notification) {
                req.flash("error", "Notification not found");
                return next(new error_handler_1.ApiError(404, "Notification not found"));
            }
            //send response
            return res.status(201).json({
                message: "Success",
                section: notification,
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
exports.default = router;
