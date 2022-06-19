"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const httpCodeJson_1 = __importDefault(require("./httpCodeJson"));
class HttpException extends Error {
    constructor(status, message, name) {
        super(message);
        this.status = status;
        this.code = `${name}/${httpCodeJson_1.default[status]}`;
        this.message = message;
    }
}
exports.default = HttpException;
