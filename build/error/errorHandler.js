"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Error Handeling Middleware for Express 
const errorHandler = (error, req, res, next) => {
    //     // if (error.type == 'redirect')
    //     //     res.redirect('/error')
    //     //  else if (error.type == 'time-out') // arbitrary condition check
    //      res.status(408).send(error)
    // if (error.status == 404) {
    //     res.status(404);
    // } else if (error.message == 'Unauthorized') {
    //     res.status(401);
    // } else if (error.message == 'Forbidden') {
    //     res.status(403);
    // }
    // else {
    //     res.status(500);
    // }
    res.status(error.status || 500)
        .json({
        errors: {
            message: error.message,
            error: error.stack,
        },
    });
};
exports.default = errorHandler;
