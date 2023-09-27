import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";

export function createMiddleware(keys: string[], model: any, options?: { next?: boolean, save?: string }): RequestHandler {
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
      if (!!options?.next){
        if (!!options.save) req.body[options.save] = doc;
        else req.body["data"] = doc;
        return next();
      };
      return res.status(201).json({
        success: true,
        data: doc.toJSON(),
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
};

