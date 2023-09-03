import { Request, Response, NextFunction } from "express";

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