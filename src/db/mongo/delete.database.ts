
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../error/error.handler";
import { Document } from "mongoose";

export function deleteById(model: any): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id = req.params.id;
      if (!id) return next(new ApiError(400, "Bad request id not found"));

      let doc: Document = await model.findByIdAndDelete(id).exec();
      //return error if doc not found
      if (!doc) {
        req.flash("error", "camera not found");
        return next(new ApiError(404, "camera not found"));
      };
      //send response to client with camera
      return res.status(201).json({
        success: true,
        data: doc,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};
