import { NextFunction, Request, Response } from "express";
import { Model } from "mongoose";
import { ApiError } from "../../error/error.handler";


{ $and: [{ ip: "ip" }, { nvr: "nvr" }] }

export function existCheck(model: Model<any>, query: any, info?: string) {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    //  query
    let state = Array.isArray(query) ? 1 : 0;
    if (!state) { // query is object -> { [{},{},...] }
      for (const key in query) {
        for (const [index, element] of query[key].entries()) {
          for (const item in element) {
            query[key][index][item] = req.body[item];
          };
        };
      };
    } else {// query is object -> [{},{},...]
      for (const [index, element] of query.entries()) {
        for (const item in element) {
          query[index][item] = req.body[item];
        };
      };
    };
    let doc = await model.findOne(query).exec();
    if (!!doc) {
      req.flash("error", info ?? "Already exists!");
      return next(new ApiError(400, info ?? "Already exists!"));
    };
    next();
  };
};

