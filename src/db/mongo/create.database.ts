import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";

export function create(keys: string[], model: any): RequestHandler {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    try {
      //get json from body request
      let payload: { [key: string]: string } = {};
      for (const key of keys) payload[key] = req.body[key];
      //create
      let doc = new model(payload);
      await doc.save();
      //return success
      req.flash("info", `${model.collection.collectionName} added.`);
      return res.status(201).json({
        success: true,
        data: doc,
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
};

