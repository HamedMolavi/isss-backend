import { NextFunction, Request, Response } from "express";


export default function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  req.body["timezone"] = req.query["timezone"];
  req.body["timez"] = req.query["timez"];
  next();
};