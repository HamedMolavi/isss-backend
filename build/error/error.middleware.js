"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function errorMiddleware(error, request, response, next) {
    const status = error.status || 500;
    const message = error.message || 'Something went wrong';
    const code = error.code || 'INTERNAL_SERVER_ERROR';
    response
        .status(status)
        .send({
        code,
        message,
    });
}
exports.default = errorMiddleware;
