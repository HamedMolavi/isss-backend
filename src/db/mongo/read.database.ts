import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";
import { Document, FilterQuery } from "mongoose";

export async function read(model: any, options?: { query?: FilterQuery<any>, populate?: string }) {
  let docs: Document[] | any = !!options?.populate
    ? await model.find(!!options?.query ? options?.query : {}).exec()
    : await model.find(!!options?.query ? options?.query : {}).populate(options?.populate).exec();
  return docs;
};

export function readMiddleware(model: any, query?: (search: string) => FilterQuery<any>,
  options?: {
    next?: boolean,
    save?: string,
    send?: CallableFunction,
    populate?: boolean,
    searchFromBody?: (body: { [key: string]: any }) => string,
    searchFromParams?: (params: { [key: string]: any }) => string
  }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {

    try {
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      let search = (req.query.search as string) || options?.searchFromBody?.(req.body) || options?.searchFromParams?.(req.params) || "";
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = strPerPage?.toLowerCase() === "all"
        ? 10000
        : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
      let docs: Document[] = !!query
        ? await model.find(query(search)).limit(perPage).skip(perPage * (page - 1)).exec()
        : await model.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
      //return response not found to client if not found
      if (!docs.length && !options?.next) {
        req.flash("error", model.name + " not found");
        return next(new ApiError(404, model.name + " not found"));
      };

      if (!!docs.length && !!options?.populate && !!req.query.populate) {
        let populates = req.query.populate instanceof String
          ? req.query.populate.split(",").map((el) => el.trim())
          : (req.query.populate as string[]).map((el) => el.trim());
        let idx = populates.length - 1;
        while (!!populates.length && idx >= 0) {
          const populate = populates[idx];
          let keys = getAllKeys(docs[0].toObject());
          let populatePath = keys.find((key) => key === populate || key.split(".").some((el) => el === populate));
          if (!!populatePath) {
            for (let i = 0; i < docs.length; i++) docs[i] = await docs[i].populate(populatePath);
            populates.splice(idx, 1);
            idx = populates.length - 1;
          } else idx--;
        };
      };

      if (!!options?.next) {
        if (!!options.save) req.body[options.save] = docs;
        else req.body["docs"] = docs;
        return next();
      };
      let data = !!options?.send
        ? docs.reduce((pre, cur) => {
          const fn = options.send as CallableFunction;
          const el = fn(cur, req);
          if (!!el) pre.push(el);
          return pre;
        }, [] as Document<any, any, any>[])
        : docs
      //return response to client
      return res.status(200).json({
        success: true,
        data,
        page: page,
        perPage: perPage,
        total: data.length,
        pages: Math.ceil((data.length) / perPage),
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};

export function readByIdMiddleware(model: any, options?: { next?: boolean, save?: string, send?: CallableFunction, populate?: boolean }, _id?: string): RequestHandler {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    try {
      //get id from params in url
      let id: string = _id || req.params.id;
      //query for get docs by id from DB
      let doc = await model.findById(id).exec();

      //return error if docs not found
      if (!doc) {
        req.flash("error", model.name + " not found");
        return next(new ApiError(404, model.name + " not found"));
      };


      if (!!options?.populate && !!req.query.populate) {
        let populates = req.query.populate instanceof String
          ? req.query.populate.split(",").map((el) => el.trim())
          : (req.query.populate as string[]).map((el) => el.trim());
        let idx = populates.length - 1;
        while (!!populates.length && idx >= 0) {
          const populate = populates[idx];
          let keys = getAllKeys(doc.toObject());
          let populatePath = keys.find((key) => key === populate || key.split(".").some((el) => el === populate));
          if (!!populatePath) {
            doc = await doc.populate(populatePath);
            populates.splice(idx, 1);
            idx = populates.length - 1;
          } else idx--;
        };
      };

      if (!!options?.next) {
        if (!!options.save) req.body[options.save] = doc;
        else req.body["doc"] = doc;
        return next();
      };
      //send response to client
      return res.status(200).json({
        success: true,
        data: !!options?.send ? options.send(doc) : doc,
      });
    } catch (err: any) {
      if (err.kind === 'ObjectId') return next(new ApiError(400, `id must be valid: ${req.params.id}`));
      else return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};

function getAllKeys(obj: { [key: string]: any }) {
  let keys: string[] = [];
  Object.keys(obj).forEach(el => keys.push(el));
  for (const key in obj) {
    if (obj[key] instanceof Object && !(obj[key] instanceof Array)) getAllKeys(obj[key]).forEach(el => keys.push(`${key}.${el}`))
  };
  return keys;
};