import { NextFunction, Request, Response } from "express";
import { Model } from "mongoose";
import { ApiError } from "../../types/classes/error.class";


export function existCheck(model: Model<any>, query: any, info?: string) {
  return async function middleware(req: Request, _res: Response, next: NextFunction) {
    // query can be:
    //    Array => state 0
    //    function => state 1
    //    object { [{},{},...] } => state 2
    
    let newQuery: { [key: string]: any } = {};
    //  query
    let state = Array.isArray(query) ? 0
      : typeof (query) === "function" ? 1
        : 2;

    switch (state) {
      case 2: // query is object -> { [{},{},...] }
        for (const key in query) {
          newQuery[key] = [];
          for (const [index, element] of query[key].entries()) {
            newQuery[key][index] = {};
              for (const item in element) {
              newQuery[key][index][item] = req.body[item];
            };
          };
        };
        break;
      case 1:
        newQuery = query(req.body)
        break;
      case 0:// query is object -> [{},{},...]
        for (const [index, element] of query.entries()) {
          newQuery[index] = {};
          for (const item in element) {
            newQuery[index][item] = req.body[item];
          };
        };
        break;
    };
    let doc = await model.findOne(newQuery).exec();
    if (!!doc) {
      req.flash("error", info ?? "Already exists!");
      return next(new ApiError(400, info ?? "Already exists!"));
    };
    next();
  };
};

