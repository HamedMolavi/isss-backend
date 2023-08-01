import { Request, Response, NextFunction } from "express";
import { ApiError } from "../error/error.handler";
import passport from "passport";
import { IncomingMessage } from "http";

export function passportGate(req: Request, _res: Response, next: NextFunction) {
  req.headers["authorization"]
  const ip = req.ip ?? req.socket.remoteAddress;
  if (!req.user) return next(new ApiError(401, "Unauthorized")); // || req.session.ip !== ip
  next();
};


export function assignPassport(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('login')(req, res, () => {
    req.session.save((err) => {
      const maxAge = req.body.is_remember ? 8 * 60 * 60 * 1000 : 15 * 60 * 1000;
      //             if remeber     8 hours       else    15 minutes
      req.session.cookie.maxAge = maxAge;
      req.session.ip = req.ip;
      next(err ? err : null);
    });
  });
};
