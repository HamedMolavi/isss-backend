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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const error_handler_1 = require("../../error/error.handler");
const sendEmail_1 = require("../../tools/sendEmail");
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
let limit_send_email = [];
//route for test send email
router.get("/:email", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let email = req.params.email;
            if (!email) {
                req.flash("error", "Please enter email");
                return next(new error_handler_1.ApiError(400, "Please enter email"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            if (limit_send_email.includes(email)) {
                //send response
                return res.status(400).json({
                    success: false,
                    data: "sms already send",
                });
            }
            //send sms test
            let result = (0, sendEmail_1.send_email)(email, "تست ارسال ایمیل");
            if (result) {
                limit_send_email.push(email);
            }
            setTimeout(() => {
                limit_send_email = limit_send_email.filter((item) => {
                    if (item != email) {
                        return item;
                    }
                });
            }, 120000);
            //send response
            return res.status(200).json({
                success: true,
                data: "email sended",
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
exports.default = router;
