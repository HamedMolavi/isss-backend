"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = exports.authorize = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
        bearerToken = bearerHeader.split(' ')[1];
        return bearerToken;
    }
    else {
        next(new Error("Forbidden"));
        return null;
    }
}
exports.getToken = getToken;
