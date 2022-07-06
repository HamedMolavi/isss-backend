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
const HttpException_1 = __importDefault(require("./../../../error/HttpException"));
const model_1 = __importDefault(require("./../../../models/model"));
const authentication_1 = require("./../../../tools/authentication");
//create router for add to server file 
const router = (0, express_1.Router)();
//add error handler middleware
router.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});
//create route for get list of models
router.get("", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get page from url
            let strPage = req.query.page;
            let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
            //get perPage from url
            let strPerPage = req.query.PerPage;
            let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get list of models
            let models = yield model_1.default.find().limit(perPage).skip(perPage * (page - 1)).exec();
            //query for get total count of models
            let total = yield model_1.default.countDocuments().exec();
            //return list of models
            return res.status(200).json({
                message: "Success",
                models: models,
                page: page,
                perPage: perPage,
                total: yield model_1.default.countDocuments().exec(),
                pages: Math.ceil((yield model_1.default.countDocuments().exec()) / perPage)
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "model"));
        }
    });
});
//route for get model by category from DB 
router.get("/:category", function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //get category from url
            let category = req.params.category;
            if (!category) {
                req.flash("error", "category is required");
                return next(new HttpException_1.default(400, "category is required", "model"));
            }
            //get token from header request and verify
            let token = (0, authentication_1.getTokenAndVerify)(req, "user", next);
            //query for get model by id from DB
            let model = yield model_1.default.findOne({ category: category }).exec();
            //check model is exist
            if (!model) {
                req.flash("error", "model is not exist");
                return next(new HttpException_1.default(400, "model is not exist", "model"));
            }
            //send model to client
            return res.status(200).json({
                message: 'Success',
                model: model
            });
        }
        catch (err) {
            return next(new HttpException_1.default(500, err.message, "model"));
        }
    });
});
exports.default = router;
