import { NextFunction, Request, Response } from 'express';
import HttpException from './HttpException';

function errorMiddleware(error: HttpException, request: Request, response: Response, next: NextFunction) {
    const status = error.status || 500;
    const message = error.message || 'Something went wrong';
    const code = error.code || 'INTERNAL_SERVER_ERROR';
    response
        .status(status)
        .send({
            code,
            message,
        })
}

export default errorMiddleware;