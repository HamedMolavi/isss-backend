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
const model_1 = __importDefault(require("../../models/model"));
const authentication_1 = require("../../tools/authentication");
//create router for add to server file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//route for get jobTitle by id from DB 
router.get("/:category", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get category from url
            let category = req.params.category;
            if (!category) {
                req.flash("error", "category is required");
                return next({ status: 400, message: "Bad request" });
            }
            //get token from header request
            let token = (0, authentication_1.getToken)(req, next);
            //verify token
            let critential = (0, authentication_1.authorize)(token);
            //check time expire token and role
            if (critential.exp < Date.now() / 1000) {
                req.flash("error", "token is expired");
                return next({ status: 401, message: "Token expired" });
            }
            //query for get model by id from DB
            let model = yield model_1.default.findOne({ category: category }).exec();
            //check model is exist
            if (!model) {
                req.flash("error", "model is not exist");
                return next({ status: 404, message: "Model is not exist" });
            }
            //send model to client
            return res.status(200).json({
                message: 'Success',
                model: model
            });
        }
        catch (err) {
            return next({ status: 500, message: `Could not get the jobTitle: ${err}` });
        }
    });
});
exports.default = router;
