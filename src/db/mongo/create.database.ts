import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../error/error.handler";

export function create(keys: string[], model: any): RequestHandler {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    try {
      //get json from body request
      let payload: { [key: string]: string } = {};
      for (const key of keys) payload[key] = req.body[key];
      //create
      let doc = new model(payload);
      //save camera in DB -> post process saves also ModelToCamera for each model
      await doc.save();
      //return success
      req.flash("info", "camera added");
      return res.status(201).json({
        success: true,
        data: doc,
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
};

