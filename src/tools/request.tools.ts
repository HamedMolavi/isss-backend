import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../types/classes/error.class";
import mongoose, { FilterQuery } from "mongoose";
import { readMiddleware } from "../db/mongo/read.database";

export function injectDataMiddleware(fn: CallableFunction, options?: { params?: boolean, injData?: string, spread?: boolean }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!!options?.spread) {
        let result: Object = await fn(!!options?.params ? req.params : req.body)
        req.body = { ...req.body, ...result }
      } else {
        req.body[options?.injData || "injData"] = await fn(!!options?.params ? req.params : req.body);
      };
      next();
    } catch (error) {
      req.flash("error", "Internal Error!");
      return next(new ApiError(500, "Internal Error!"));
    };
  };
};

export function docSendMiddleware(bodyFieldName: string | string[]) {
  return async function docSendHandler(req: Request, res: Response, next: NextFunction) {
    //get page from url
    let strPage = req.query.page as string;
    let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
    //get perPage from url
    let strPerPage = req.query.perPage as string;
    let perPage = strPerPage?.toLowerCase() === "all"
      ? 10000
      : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
    //return response not found to client if not found
    let data: any[] = [];
    if (typeof bodyFieldName === "string") data = req.body?.[bodyFieldName];
    else for (const fieldName of bodyFieldName) data = [...data, ...req.body?.[fieldName]];
    if (!data || !data.length) {
      req.flash("error", bodyFieldName + " not found");
      return next(new ApiError(404, bodyFieldName + " not found"));
    };
    return res.status(200).json({
      success: true,
      data: data,
      page: page,
      perPage: perPage,
      total: data.length,
      pages: Math.ceil((data.length) / perPage),
    });
  }
};
export function makeSearchFnWithOr(field: string, options?: { includes?: boolean }) {
  return function searchFn(search: string) {
    let query: { $or: Array<{ [key: string]: any }> } = { $or: [] };
    for (const id of search.split(",")) if (!!id) query["$or"].push({
      [field]: !!options?.includes ? { $in: [new mongoose.Types.ObjectId(search)] } : new mongoose.Types.ObjectId(id)
    });
    return query;
  }
};
export function makesearchFromBody(bodyFieldName: string) {
  return function searchFromBody(body: any) {
    let ids: string[] = [];
    for (const doc of body[bodyFieldName]) ids.push(doc.id);
    return ids.join(',');
  }
};

export function DoNotAllowOnDefault(model: any, query: FilterQuery<any>) {
  return [
    readMiddleware(model, (search: string) => { return { _id: new mongoose.Types.ObjectId(search), ...query } }, { searchFromParams: (params) => params.id, next: true, save: 'docs' }),
    (req: Request, res: Response, next: NextFunction) => {
      if (!!req.body["docs"].length) {
        req.flash("error", "Can't change default " + model.collection.collectionName + "!");
        return next(new ApiError(403, "Can't change default " + model.collection.collectionName + "!"));
      };
      return next();
    }
  ];
};

export function exposeUserToBody(options?: { propertyName?: string }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    req.body[options?.propertyName ?? "user"] = req.user;
    return next();
  }
}