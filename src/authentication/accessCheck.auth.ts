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


export function cameraAccessCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  
  const camera_access = req.user["camera_access"]?.map((val) => val.toString());
  const roomId = req.headers.roomid as string;
  console.log(camera_access, roomId, !!roomId && !camera_access?.includes(roomId));
  if (!!roomId && !camera_access?.includes(roomId)) return next(new ApiError(403, "Unauthorized!"))
  next();
}