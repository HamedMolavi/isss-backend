import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";

export function createMiddleware(keys: Array<string | { [key: string]: CallableFunction }>, model: any, options?: { next?: boolean, save?: string, send?: CallableFunction }): RequestHandler {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    try {
      //get json from body request
      let payload: { [key: string]: string } = {};
      for (const key of keys) {
        if (typeof (key) === "string") payload[key] = req.body[key];
        else if (typeof (key) === "object") payload[Object.keys(key)[0]] = Object.values(key)[0](req.body);
      };
      //create
      let doc = new model(payload);
      await doc.save();
      //return success
      req.flash("info", `${model.collection.collectionName} added.`);
      if (!!options?.next) {
        if (!!options.save) req.body[options.save] = doc;
        else req.body["data"] = doc;
        return next();
      };
      return res.status(201).json({
        success: true,
        data: !!options?.send ? options.send(doc) : doc.toJSON(),
      });
    } catch (err: any) {
      return next(new ApiError(500, "Internal server error , " + err.message));
    }
  }
};

export async function create(model: any, payloads: { [key: string]: any } | Array<{ [key: string]: any }>) {
  if (payloads instanceof Object) payloads = [payloads as { [key: string]: any }];
  let docs = [];
  for (const payload of payloads as Array<{ [key: string]: any }>) {
    //create
    let doc = new model(payload);
    await doc.save();
    docs.push(doc)
    //return success
  };
  return docs;
};

