import jwt from "jsonwebtoken";
import { Request } from "express";


//define token type after verify
export interface ICritential {
    id: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
}

//verify token
export function authorize(token: string) {
    //get secret key from environment
    const secret = process.env["JWT_SECRET"] as string;
    //verify token
    const critential = jwt.verify(token, secret);
    return critential;
}

//get token from body request client
export function getToken(req: Request, next: Function) {
    //get id from header request
    let id = req.params.id;
    //get body request
    const userBody = req.body;
    //get token from header request
    const bearerHeader = req.headers.authorization;
    let bearerToken: string;
    if (bearerHeader) {
        bearerToken = bearerHeader.split(' ')[1];
        return bearerToken;
    } else {
        next(new Error("Forbidden"));
        return null;
    }
}