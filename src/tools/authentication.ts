import jwt from "jsonwebtoken";
import { Request } from "express";
import { ApiError } from "../error/error.handler";

//define token type after verify
export interface ICritential {
  id: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  remember: boolean;
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
    bearerToken = bearerHeader.split(" ")[1];
    return bearerToken;
  } else {
    next(new ApiError(401, "Unauthorized"));
    return null;
  }
}
//get token from header request client and verify
export function getTokenAndVerify(req: Request, role: string, next: Function) {
  try {
    //get token from header request
    let token: string = getToken(req, next) as string;
    //send error if token not found
    if (!token) {
      next(new ApiError(401, "Unauthorized"));
      return null;
    }
    //verify token
    let critential = authorize(token) as ICritential;
    //check time expire token and role
    if (critential.exp < Date.now() / 1000) {
      req.flash("error", "Token expired");
      return next(new ApiError(401, "Token expired"));
    } else if (critential.role !== "admin" && role === "admin") {
      req.flash("error", "You are not admin");
      return next(new ApiError(401, "You are not admin"));
    } else {
      return token;
    }
  } catch (e: any) {
    //return error if token not verify
    next(new ApiError(401, "Internal server error token not verify -> " + e.message));
  }
}
