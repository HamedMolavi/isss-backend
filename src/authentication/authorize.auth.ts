import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types/classes/error.class";
import cookie from "cookie-signature";
import passport from "passport";

export function passportGate(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  return next();
};

export function assignPassport(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('login')(req, res, () => {
    req.session.save((err: Error) => {
      if (req.user.role !== "admin") {
        const maxAge = req.body.is_remember ? 31536000000 : 28800000;
        //             if remeber     1 year       else    8 hours
        req.session.cookie.maxAge = maxAge;
      }
      next(err ? err : null);
    });
  });
};

export function sendTokenToclient(req: Request, res: Response, next: NextFunction) {
  let token = encodeURIComponent("s:" + cookie.sign(req.sessionID, process.env["SESSION_SECRET"] as string));
  if (!req.sessionID) next(new ApiError(500, "Internal Error!"));
  else {
    res.status(200).json({
      success: true,
      data: { token, ...req.user }, //TODO: ...req.user,
    }); return;
  };
};

export function reLogin(req: Request, res: Response, next: NextFunction) {
  if (req.user) return sendTokenToclient(req, res, next)
  return next();
};