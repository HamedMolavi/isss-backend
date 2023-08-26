import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types/classes/error.class";
import passport from "passport";
import cookie from "cookie-signature";
import session from "express-session";
import redisStore from "../db/redis/store.database";

export function passportGate(req: Request, _res: Response, next: NextFunction) {
  const ip = req.ip ?? req.socket.remoteAddress; //TODO
  if (!req.user) return next(new ApiError(401, "Unauthorized")); // || req.session.ip !== ip
  return next();
};


export function assignPassport(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('login')(req, res, () => {
    req.session.save((err: Error) => {
      const maxAge = req.body.is_remember ? 8 * 60 * 60 * 1000 : 15 * 60 * 1000;
      //             if remeber     8 hours       else    15 minutes
      req.session.cookie.maxAge = maxAge;
      req.session.ip = req.ip;
      next(err ? err : null);
    });
  });
};

<<<<<<< Updated upstream
export function authHeaderExtraction(req: Request, _res: Response, next: NextFunction) {
  if (!req.cookies?.Bearer && !!req.headers["authorization"]) {
    let token: string | undefined = decodeURIComponent(req.headers["authorization"]?.split("Bearer ")[1]);
    if (!!req.cookies) req.cookies["Bearer"] = token; // TODO: also write it to req.headers.cookie
    else req.cookies = { "Bearer": token };
  } else {
    // TODO: new guy or it has cookie.Bearer;
  };
  return next();
};

=======
>>>>>>> Stashed changes
export function sendTokenToclient(req: Request, res: Response, next: NextFunction) {
  let token = encodeURIComponent("s:" + cookie.sign(req.sessionID, process.env["SESSION_SECRET"] as string));
  if (!req.sessionID) next(new ApiError(500, "Internal Error!"));
  else {
    return res.status(200).json({
      success: true,
      data: { token,...req.user }, //TODO: ...req.user,
    });
  };
<<<<<<< Updated upstream
};

export const sessionMiddleware = session({
  store: redisStore(),
  name: "Bearer",
  secret: process.env["SESSION_SECRET"] as string, // TODO: remove as string
  resave: false,//if you want to keep the session in case of user activity, set these both to true.
  rolling: false,//if you want to keep the session in case of user activity, set these both to true.
  saveUninitialized: false,
  cookie: {
    maxAge: undefined,
    httpOnly: true,
  },
});
=======
<<<<<<< Updated upstream
};
=======
};

>>>>>>> Stashed changes
>>>>>>> Stashed changes
