import { NextFunction, Request, Response } from "express";


export default function (req: Request, res: Response, next: NextFunction) {
  req.body["timezone"] = req.query["timezone"] ?? req.query["timez"] ?? "Asia/Tehran";
  req.body["timez"] = req.query["timez"] ?? req.query["timezone"] ?? "Asia/Tehran";
  next();
};