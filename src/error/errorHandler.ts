import { ErrorRequestHandler, NextFunction, Response, Request } from "express";

// Error Handeling Middleware for Express 
const errorHandler: ErrorRequestHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
    //     // if (error.type == 'redirect')
    //     //     res.redirect('/error')

    //     //  else if (error.type == 'time-out') // arbitrary condition check
    //      res.status(408).send(error)
    if (error.message == 'Not Found') {
        res.status(404);
    } else if (error.message == 'Unauthorized') {
        res.status(401);
    } else if (error.message == 'Forbidden') {
        res.status(403);
    }
    else {
        res.status(500);
    }
    res.json({
        errors: {
            message: error.message,
            error: {},
        },
    });
};

export default errorHandler;