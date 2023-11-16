
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";
import { Document } from "mongoose";

export function deleteByIdMiddleware(model: any, options?: { next?: boolean, save?: string, send?: CallableFunction }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id = req.params.id;
      if (!id) return next(new ApiError(400, "Bad request id not found"));

      let doc: Document = await model.findByIdAndDelete(id).exec();
      //return error if doc not found
      if (!doc) {
        req.flash("error", model.name + "not found");
        return next(new ApiError(404, model.name + "not found"));
      };
      if (!!options?.next) {
        if (options?.save) req.body[options.save] = doc
        else req.body["doc"] = doc
        return next();
      };
      //send response to client
      return res.status(204).json({
        success: true,
        data: !!options?.send ? options.send(doc) : doc,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};
