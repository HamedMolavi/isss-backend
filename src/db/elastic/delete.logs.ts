import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";


/**
 * Middleware generator for deleting a document by ID in Elasticsearch.
 *
 * This middleware is designed to handle deletion requests for documents stored in Elasticsearch.
 * It supports dynamic index determination based on request parameters or environment variables, optional custom response handling,
 * and the ability to extract and pass additional data through the request pipeline.
 *
 * @param {string | ((req: Request) => string)} index_name - The name of the Elasticsearch index where the document resides. Can be a static string or a function returning the index name dynamically based on the request.
 * @param {Object} [options={}] - Optional settings for the middleware behavior.
 * @param {boolean} [options.next=false] - If true, the middleware will call the next handler instead of sending a response directly.
 * @param {(doc: unknown, req: Request) => any | void | Promise<any | void>} [options.send] - A custom function to handle the response. Receives the deleted document and the request object.
 * @param {string} [options.save="esRes"] - The key under which the response data will be saved in the request body when calling the next handler.
 * @param {(req: Request) => string | undefined} [options.idFromReq] - A function to extract the document ID from the request. Useful for overriding the default ID extraction logic.
 * @param {string} [_id] - The ID of the document to delete. This parameter is optional and will fall back to extracting the ID from the request parameters or the `idFromReq` option.
 * @returns {RequestHandler} - Returns an asynchronous middleware function that processes the deletion request.
 */
export function deleteByIdElasticMiddleware(
  index_name: string | ((req: Request) => string),
  options?: {
    next?: boolean,
    send?: (doc: unknown, req: Request) => any | void | Promise<any | void>,
    save?: string,
    idFromReq?: (req: Request) => string | undefined,
  }, _id?: string): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      let _timezone = req.query.timez as string;
      let id: string = options?.idFromReq?.(req) ?? _id ?? req.params.id ?? "dummy-id";
      const index = typeof (index_name) === "function" ? index_name(req) : index_name;
      let doc = await process.esclient.get({ index, id });
      await process.esclient.delete({ index, id });
      if (!!Array.isArray(req.body["elasticsearchIndices"])) req.body["elasticsearchIndices"].push(index);
      else req.body["elasticsearchIndices"] = [index];

      let data = !!options?.send ? options.send({ "_id": doc?._id, ...(doc?._source ?? {}) }, req)
        : { "_id": doc?._id, ...(doc?._source ?? {}) };

      if (options?.next) {
        req.body[options?.save ?? 'esRes'] = data;
        return next();
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      if (err.statusCode === 404) return next(new ApiError(404, "Log not found " + err.meta?.body?._id));
      if (err.meta?.body?.error?.type === "index_not_found_exception") return next(new ApiError(500, "internal server error , " + err.message));
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};

