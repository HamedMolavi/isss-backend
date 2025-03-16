
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";
import { Document } from "mongoose";

export function deleteByIdMiddleware(model: any, options?: {
  next?: boolean, save?: string, send?: CallableFunction,
  idGenerator?: (bodyQueryPramas: any) => "string" | Promise<"string">
}): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get id from url
      let id = !!options?.idGenerator ? await options.idGenerator({ ...req.body, ...req.params, ...req.query }) : req.params.id;
      if (!id) return next(new ApiError(400, "Bad request id not found"));

      let doc: Document = await model.findByIdAndDelete(id).exec();
      //return error if doc not found
      if (!doc) {
        next(new ApiError(404, model.collection.collectionName + "not found"));
        return
      };
      if (!!options?.next) {
        if (options?.save) req.body[options.save] = doc
        else req.body["doc"] = doc
        next();
        return
      };
      //send response to client
      res.status(204).json({
        success: true,
        data: !!options?.send ? options.send(doc) : doc,
      });
      return
    } catch (err: any) {
      next(new ApiError(500, "internal server error , " + err.message));
      return
    }
  }
};

/*
export function deleteMiddleware(
  model: any,
  options?: {
    sendDocsInsteadOfDeleteResult?: boolean,
    send?: (doc: unknown, req: Request) => any | void | Promise<any | void>,
    next?: boolean,
    save?: string
  }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      let strPerPage = req.query.perPage as string;
      let perPage = strPerPage?.toLowerCase() === "all" ? 10000 : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
      ////////////////

      // size: perPage, from: (page - 1) * perPage,

      const searchResult = await process.esclient.search(baseSearch);
      const ids: Array<string> = [];
      const frameIds: Array<string> = [];
      for (const doc of searchResult) {
        ids.push(doc._id);
        if (!!(doc._source as any).frame_id) frameIds.push((doc._source as any).frame_id);
      };
      const result = await process.esclient.deleteByQuery({
        index, body: { query: { terms: { _id: ids } } }
      });
      const deletedFrames = await process.esclient.deleteByQuery({
        index: frame_index, body: { query: { terms: { _id: frameIds } } }
      });


      if (options?.next) {
        req.body[options?.save ?? 'esRes'] = !!options?.sendDocsInsteadOfDeleteResult ? data : result;
        next();
        return
      }

      res.status(204).json({
        success: true,
        data: result,
      });
      return
    } catch (err: any) {
      if (err.statusCode === 404 || err.meta?.body?.error?.type === "index_not_found_exception") return next(new ApiError(404, "index not found " + err.meta?.body?._id));
      next(new ApiError(500, "internal server error , " + err.message));
      return
    }
  }
};
*/