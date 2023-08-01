import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../error/error.handler";
import { Document, FilterQuery } from "mongoose";

export async function read(model: any, query?: FilterQuery<any>) {
  let docs: Document[] = await model.find(!!query ? query : {}).exec();
  return docs;
};

export function readMiddleware(model: any, query: (search: string) => FilterQuery<any>): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      let search = (req.query.search as string) || "";
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

      let docs: Document[] =
        (!!search
          ? await model.find(query(search))
          : await model.find({}))
          .limit(perPage)
          .skip(perPage * (page - 1))
          .exec();

      //return response not found to client if not found cameras
      if (!docs) {
        req.flash("error", "Cameras not found");
        return next(new ApiError(404, "Cameras not found"));
      };

      //return response to client
      return res.status(200).json({
        success: true,
        data: docs,
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

export function readByIdMiddleware(model: any): RequestHandler {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    try {
      //get id from params in url
      let id: string = req.params.id;
      //query for get camera by id from DB
      let doc = await model.findById(id).exec();

      //return error if camera not found
      if (!doc) {
        req.flash("error", "camera not found");
        return next(new ApiError(404, "camera not found"));
      };

      //send response to client with camera
      return res.status(200).json({
        success: true,
        data: doc,
      });
    } catch (err: any) {
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};