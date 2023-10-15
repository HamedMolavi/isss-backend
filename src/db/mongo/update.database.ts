import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";
import { Document, Model } from "mongoose";

export function updateByIdMiddleware(model: Model<any, any, any, any>, options?: { next?: boolean, save?: string, update?: { [key: string]: CallableFunction }, send?: CallableFunction }): RequestHandler {
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
      // let doc: Document = await model.updateOne({ _id: id }, payload, { new: true }).exec();
      //update document manually using save => to use save midllewares (pre, post)
      let doc = await model.findById(id).exec();
      for (const key in payload) if (Object.prototype.hasOwnProperty.call(payload, key)) {
        if (!!options?.update && Object.keys(options?.update).includes(key)) doc[key] = options.update[key](payload[key])
        else doc[key] = payload[key];
      };
      await doc.save();
      //return error if user not found
      if (!doc) {
        req.flash("error", "camera not found");
        return next(new ApiError(404, "camera not found"));
      };
      if (!!options?.next) {
        if (options?.save) req.body[options.save] = doc
        else req.body["doc"] = doc
        return next();
      };
      //send response to client with user
      return res.status(201).json({
        success: true,
        data: !!options?.send ? options.send(doc) : doc,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};