import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types/classes/error.class";
import passport from "passport";
import cookie from "cookie-signature";

export function passportGate(req: Request, _res: Response, next: NextFunction) {
  //TODO: check ip too
  if (!req.user) return next(new ApiError(401, "Unauthorized"));
  return next();
};

export function assignPassport(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('login')(req, res, () => {

    req.session.save((err: Error) => {
      const maxAge = req.body.is_remember ? 8 * 60 * 60 * 1000 : 15 * 60 * 1000;
      //             if remeber     8 hours       else    15 minutes
      req.session.cookie.maxAge = maxAge;
      req.session.ip = req.ip ?? req.socket.remoteAddress;
      next(err ? err : null);
    });
  });
};

export function sendTokenToclient(req: Request, res: Response, next: NextFunction) {
  let token = encodeURIComponent("s:" + cookie.sign(req.sessionID, process.env["SESSION_SECRET"] as string));
  if (!req.sessionID) next(new ApiError(500, "Internal Error!"));
  else {
    return res.status(200).json({
      success: true,
      data: { token, ...req.user }, //TODO: ...req.user,
    });
  };
};

export function reLogin(req: Request, res: Response, next: NextFunction) {
  if (req.user) return sendTokenToclient(req, res, next)
  next()
};