import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";
import { Document, Model } from "mongoose";
import { setNestedObjectValue } from "../../tools/utils.tools";

type FirstUpdateType = (payload: { [key: string]: any }) => any
type SecondUpdateType = { name: string, fn?: (payload: { [key: string]: any }) => any }
type UpdateType = { [key: string]: FirstUpdateType | SecondUpdateType }

export function updateByIdMiddleware(model: Model<any, any, any, any>, options?: { next?: boolean, save?: string, update?: UpdateType, send?: CallableFunction, ignore?: string[] }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id: string = req.params.id || req.body.id;
      if (!id) {
        req.flash("error", "id not found");
        return next(new ApiError(400, "Bad request"));
      };
      //get json from body request
      const payload = req.body;
      //query for get user by id from DB
      // let doc: Document = await model.updateOne({ _id: id }, payload, { new: true }).exec();
      //update document manually using save => to use save midllewares (pre, post)
      let doc: Document = await model.findById(id).exec();
      //return error if user not found
      if (!doc) {
        req.flash("error", "camera not found");
        return next(new ApiError(404, "camera not found"));
      };
      let keys = Object.keys(payload).filter((el) => !options?.ignore || !options?.ignore?.includes(el));
      let updateObject: { [key: string]: any } = {};
      for (const key of keys) if (Object.prototype.hasOwnProperty.call(payload, key)) {
        if (!!options?.update && Object.keys(options?.update).includes(key)) {
          switch (typeof options.update[key]) {
            case 'function':
              updateObject[key] = await (options.update[key] as FirstUpdateType)(payload)
              break;
            case 'object':
              let path = options.update[key].name.split(".");
              if (!!(options.update[key] as SecondUpdateType).fn) {
                setNestedObjectValue(updateObject, path, await (options.update[key] as SecondUpdateType).fn?.(payload));
              } else {
                setNestedObjectValue(updateObject, path, payload[key]);
              };
              break;
          };
        } else updateObject[key] = payload[key];
      };
      doc = await model.findByIdAndUpdate(id, { $set: updateObject }, {
        new: true,
        overwrite: true
      }).exec();

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