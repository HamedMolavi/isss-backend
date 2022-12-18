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
const sendSms_1 = require("../../tools/sendSms");
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
let limit_send_sms = [];
//route for test send sms
router.get("/:phone_number", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get id from url
            let phone_number = req.params.phone_number;
            if (!phone_number) {
                req.flash("error", "Please enter phone number");
                return next(new error_handler_1.ApiError(400, "Please enter phone number"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, const_role, next);
            if (!token) {
                return null;
            }
            if (limit_send_sms.includes(phone_number)) {
                //send response
                return res.status(400).json({
                    success: false,
                    data: "sms already sent",
                });
            }
            //send sms test
            let result = (0, sendSms_1.send_sms)(phone_number, "تست ارسال اس ام اس");
            if (result) {
                limit_send_sms.push(phone_number);
                setTimeout(() => {
                    limit_send_sms = limit_send_sms.filter((item) => {
                        if (item != phone_number) {
                            return item;
                        }
                    });
                }, 120000);
            }
            //send response
            return res.status(200).json({
                success: true,
                data: "sms sent",
            });
        }
        catch (err) {
            return next(new error_handler_1.ApiError(500, "internal server error , " + err.message));
        }
    });
});
exports.default = router;
