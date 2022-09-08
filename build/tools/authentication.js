"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenAndVerify = exports.getToken = exports.authorize = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const error_handler_1 = require("../error/error.handler");
//verify token
function authorize(token) {
    //get secret key from environment
    const secret = process.env["JWT_SECRET"];
    //verify token
    const critential = jsonwebtoken_1.default.verify(token, secret);
    return critential;
}
exports.authorize = authorize;
//get token from body request client
function getToken(req, next) {
    //get id from header request
    let id = req.params.id;
    //get body request
    const userBody = req.body;
    //get token from header request
    const bearerHeader = req.headers.authorization;
    let bearerToken;
    if (bearerHeader) {
        bearerToken = bearerHeader.split(" ")[1];
        return bearerToken;
    }
    else {
        next(new error_handler_1.ApiError(401, "Unauthorized"));
        return null;
    }
}
exports.getToken = getToken;
//get token from header request client and verify
function getTokenAndVerify(req, role, next) {
    try {
        //get token from header request
        let token = getToken(req, next);
        //send error if token not found
        if (!token) {
            next(new error_handler_1.ApiError(401, "Unauthorized"));
            return null;
        }
        //verify token
        let critential = authorize(token);
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next(new error_handler_1.ApiError(401, "Token expired"));
        }
        else if (critential.role !== "admin" && role === "admin") {
            req.flash("error", "You are not admin");
            return next(new error_handler_1.ApiError(401, "You are not admin"));
        }
        else {
            return token;
        }
    }
    catch (e) {
        //return error if token not verify
        next(new error_handler_1.ApiError(500, "Internal server error token not verify -> " + e.message));
    }
}
exports.getTokenAndVerify = getTokenAndVerify;
