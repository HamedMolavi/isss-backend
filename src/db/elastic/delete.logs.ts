import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../../types/classes/error.class";
import { SearchRequest } from "@elastic/elasticsearch/lib/api/types";
const frame_index = process.env["FRAME_INDEX"] ?? "frame_log";
const plate_index = process.env["PLATE_INDEX"] ?? "plate_log";
const search_index = process.env["PLATE_INDEX"] ?? "plate_log";
const face_index = process.env["FACE_INDEX"] ?? "face_log";
const sabotage_index = process.env["SABOTAGE_INDEX"] ?? "sabotage_log";
const objectdetection_index = process.env["OBJECT_INDEX"] ?? "objectdetection_log";
const human_index = process.env["HUMAN_INDEX"] ?? "human_log";

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
      let doc = await process.esclient.get<any>({ index, id });
      if (req.user.role !== "admin"
        && !!doc?._source?.camera_id
        && !req.user.camera_access?.some(cam => cam.toString() === doc._source.camera_id)) {
        req.flash("error", `No access!`)
        return next(new ApiError(403, "No access! , "))
      }


      await process.esclient.delete({ index, id });
      if (!!Array.isArray(req.body["elasticsearchIndices"])) req.body["elasticsearchIndices"].push(index);
      else req.body["elasticsearchIndices"] = [index];

      let data = !!options?.send ? options.send({ "_id": doc?._id, ...(doc?._source ?? {}) }, req)
        : { "_id": doc?._id, ...(doc?._source ?? {}) };

      if (options?.next) {
        req.body[options?.save ?? 'esRes'] = data;
        return next();
      }

      return res.status(204).json({
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

/**
 * Middleware generator for deleting multiple documents from Elasticsearch.
 *
 * This middleware is designed to handle bulk deletion requests for documents stored in Elasticsearch.
 * It supports dynamic index determination based on request parameters or environment variables,
 * optional custom response handling, and the ability to extract and pass additional data through the request pipeline.
 *
 * @param {string | ((req: Request) => string)} index_name - The name of the Elasticsearch index where the documents reside.
 * Can be a static string or a function returning the index name dynamically based on the request.
 *
 * @param {Object} [options={}] - Optional settings for the middleware behavior.
 *
 * @param {boolean} [options.sendDocsInsteadOfDeleteResult=false] - If true, the middleware will return the deleted documents instead of the delete operation result.
 *
 * @param {(doc: unknown, req: Request) => any | void | Promise<any | void>} [options.send] - A custom function to handle the response.
 * Receives each deleted document and the request object.
 *
 * @param {boolean} [options.next=false] - If true, the middleware will call the next handler instead of sending a response directly.
 *
 * @param {string} [options.save="esRes"] - The key under which the response data will be saved in the request body when calling the next handler.
 *
 * @returns {RequestHandler} - Returns an asynchronous middleware function that processes the bulk deletion request.
 */
export function deleteElasticMiddleware(
  index_name: string | ((req: Request) => string),
  options?: {
    sendDocsInsteadOfDeleteResult?: boolean,
    send?: (doc: unknown, req: Request) => any | void | Promise<any | void>,
    next?: boolean,
    save?: string
  }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const confirm = req.query['confirm']?.toString()?.toLocaleLowerCase() === "true";
      if (!confirm) return next(new ApiError(400, "You didn't confirm the deletion or you don't have the access!"));
      const index = typeof (index_name) === "function" ? index_name(req) : index_name;
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = strPerPage?.toLowerCase() === "all" ? 10000
        : parseInt(strPerPage) > 0 ? parseInt(strPerPage)
          : 1;
      let baseSearch: SearchRequest = {
        index,
        size: perPage, from: (page - 1) * perPage,
        track_total_hits: true,
        sort: [{ timestamp: { order: "asc" } }],
        // _source: ['frame_id']
      };
      const searchResult = await process.esclient.search(baseSearch);
      if (!!Array.isArray(req.body["elasticsearchIndices"])) req.body["elasticsearchIndices"].push(index);
      else req.body["elasticsearchIndices"] = [index];
      let data = searchResult.hits.hits?.map((doc) => ({ "_id": doc._id, ...(doc._source ?? {}) }));
      if (!!options?.send?.call) data = await Promise.all(data.map((doc) => options?.send?.(doc, req)));

      const ids: Array<string> = [];
      const frameIds: Array<string> = [];
      for (const doc of searchResult.hits.hits) {
        ids.push(doc._id);
        if (!!(doc._source as any).frame_id) frameIds.push((doc._source as any).frame_id);
      };
      const result = await process.esclient.deleteByQuery({
        index, body: { query: { terms: { _id: ids } } }
      });
      process.esclient.indices.flush({ index, force: true, ignore_unavailable: true })
      if ([plate_index, search_index, face_index].includes(index)) {
        const deletedFrames = await process.esclient.deleteByQuery({
          index: frame_index, body: { query: { terms: { _id: frameIds } } }
        });
        process.esclient.indices.flush({ index: frame_index, force: true, ignore_unavailable: true })
      }


      if (options?.next) {
        req.body[options?.save ?? 'esRes'] = !!options?.sendDocsInsteadOfDeleteResult ? data : result ;
        return next();
      }

      return res.status(204).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err.statusCode === 404 || err.meta?.body?.error?.type === "index_not_found_exception") return next(new ApiError(404, "index not found " + err.meta?.body?._id));
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};

