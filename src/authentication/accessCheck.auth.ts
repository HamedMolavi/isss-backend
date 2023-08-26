import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types/classes/error.class";
import { Access } from "../types/enums/access.enum";



export default function accessCheck(access: Access, role: string) {
  return function middleware(req: Request, _res: Response, next: NextFunction) {
    const user = req.user;
    switch (user.role) {
      case "admin":
        break;
      case "user":
        if (user[access] !== true) {
          req.flash("error", "No access => " + access + " access needed.");
          return next(new ApiError(403, "No access => " + access + " access needed."));
        };
        if (role === "admin") {
          req.flash("error", "You are not admin");
          return next(new ApiError(403, "You are not admin"));
        };
        break;
      default:
        break;
    }
    return next();
  };
};
