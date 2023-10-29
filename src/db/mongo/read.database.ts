import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";
import { Document, FilterQuery } from "mongoose";

export async function read(model: any, options?: { query?: FilterQuery<any>, populate?: string }) {
  let docs: Document[] | any = !!options?.populate
    ? model.find(!!options?.query ? options?.query : {}).exec()
    : model.find(!!options?.query ? options?.query : {}).populate(options?.populate).exec();
  return docs;
};

export function readMiddleware(model: any, query?: (search: string) => FilterQuery<any>, options?: { next?: boolean, save?: string, send?: CallableFunction, populates?: Array<string> }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      let search = (req.query.search as string) || "";
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
      let docs: Document[] = !!query
        ? await model.find(query(search)).limit(perPage).skip(perPage * (page - 1)).exec()
        : await model.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
      //return response not found to client if not found
      if (!docs) {
        req.flash("error", model.name + " not found");
        return next(new ApiError(404, model.name + " not found"));
      };
      if (!!options?.populates) for (const populate of options.populates) {
        for (let i = 0; i < docs.length; i++) {
          const doc = await docs[i].populate(populate);
          docs[i] = doc
        }
      };

      if (!!options?.next) {
        if (!!options.save) req.body[options.save] = docs;
        else req.body["docs"] = docs;
        return next();
      };
      //return response to client
      return res.status(200).json({
        success: true,
        data: !!options?.send ? docs.map(options.send as (value: Document<any, any, any>, index: number, array: Document<any, any, any>[]) => unknown) : docs,
        page: page,
        perPage: perPage,
        total: await model.countDocuments().exec(),
        pages: Math.ceil((await model.countDocuments().exec()) / perPage),
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};

export function readByIdMiddleware(model: any, options?: { next?: boolean, save?: string, send?: CallableFunction, populates?: Array<string> }): RequestHandler {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    try {
      //get id from params in url
      let id: string = req.params.id;
      //query for get docs by id from DB
      let doc = await model.findById(id).exec();

      //return error if docs not found
      if (!doc) {
        req.flash("error", model.name + " not found");
        return next(new ApiError(404, model.name + " not found"));
      };
      if (!!options?.populates) for (const populate of options.populates) doc.populate(populate);

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
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};