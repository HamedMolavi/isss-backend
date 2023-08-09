import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";
import { Document } from "mongoose";

export function updateById(model: any): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id;
      if (!id) {
        req.flash("error", "id not found");
        return next(new ApiError(400, "Bad request"));
      };
      //get json from body request
      const payload = req.body;
      //query for get user by id from DB
      let doc: Document = await model.findByIdAndUpdate(id, payload, { new: true }).exec();
      //return error if user not found
      if (!doc) {
        req.flash("error", "camera not found");
        return next(new ApiError(404, "camera not found"));
      };
      //send response to client with user
      return res.status(201).json({
        success: true,
        data: doc,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};