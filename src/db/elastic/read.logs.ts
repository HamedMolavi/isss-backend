import { NextFunction, RequestHandler, Request, Response } from 'express';
import mongoose, { ObjectId } from 'mongoose';
import { ApiError } from '../../types/classes/error.class';
import { AggregationsAggregate, SearchHit, SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { englishPlateDict, persianPlateDict } from '../../tools/plate.tools';
import { ICar, ICarBrand, ICarColor } from '../../types/interfaces/car.interface';
import { IPersonnel } from '../../types/interfaces/personnel.interface';
import { getLogFromElastic } from './connect.database';
import Time from '../../tools/time.tools';
import { randomUuid } from '../../tools/utils.tools';



type PapulatedCar = ICar & { _id: ObjectId } & { owner: IPersonnel } & { color: ICarColor } & { brand: ICarBrand }
type Report = {
  [key: string]: any;
  // brand: string[] | null | undefined;
  // color: string[] | null | undefined;
  owner: string[] | null | undefined;
};

/**
 * Middleware function to read data from an Elasticsearch index.
 * 
 * This function is designed to be used as middleware in an Express.js application,
 * allowing for the retrieval of documents from an Elasticsearch index based on the provided search criteria.
 * It supports dynamic index name resolution, customizable search requests, and optional processing of the retrieved documents.
 * 
 * @param {string | ((req: Request) => string)} index_name - The name of the Elasticsearch index to search within. Can be a string or a function that returns the index name based on the request.
 * @param {Object} [options] - Optional configuration object.
 * @param {boolean} [options.next=false] - If true, the middleware will pass control to the next middleware function in the stack without sending a response.
 * @param {string} [options.save] - The key under which to save the retrieved documents in the request body, if `options.next` is true.
 * @param {(doc: unknown, req: Request) => any | void | Promise<any | void>} [options.send] - A callback function to process the retrieved documents before sending the response or saving to a field.
 * @param {(body: { [key: string]: any }) => SearchRequest} [options.searchFromReq] - A function to construct the search request from the request body.
 * @param {(params: { [key: string]: any }) => SearchRequest} [options.searchFromParams] - A function to construct the search request from the request parameters.
 * @param {(query: { [key: string]: any }) => SearchRequest} [options.searchFromQuery] - A function to construct the search request from the request query.
 * 
 * @returns {RequestHandler} - An Express.js middleware function.
 * 
 * @example
 * // Usage in an Express.js route
 * app.get('/search', readElasticMiddlewareHamed('myIndex', {
 *   searchFromQuery: (query) => ({ query: { match_all: {} } }),
 *   send: (doc) => ({ id: doc._id, data: doc._source })
 * }));
 */
export function readElasticMiddleware(
  index_name: string | ((req: Request) => string),
  options?: {
    next?: boolean,
    save?: string,
    forceAll?: boolean,
    send?: (doc: unknown, req: Request) => any | void | Promise<any | void>,
    filter?: (doc: unknown, req: Request) => boolean | Promise<boolean>,
    searchFromReq?: (req: Request) => SearchRequest,
    searchFromParams?: (params: { [key: string]: any }) => SearchRequest
    searchFromQuery?: (query: { [key: string]: any }) => SearchRequest
  }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = strPerPage?.toLowerCase() === "all" ? 10000
        : parseInt(strPerPage) > 0 ? parseInt(strPerPage)
          : 1;
      let index = typeof (index_name) === "function" ? index_name(req) : index_name;
      let baseSearch: SearchRequest = {
        index,
        size: perPage, from: (page - 1) * perPage,
        track_total_hits: true,
        sort: [{ timestamp: { order: "desc" } }]
      };
      let search: SearchRequest = { ...baseSearch, ...(options?.searchFromReq ?? options?.searchFromParams ?? options?.searchFromQuery)?.(req) }; // TODO: why req gets in no matter what we use?
      const settings = await process.esclient.indices.getSettings({ index }).then(response => response[index]?.settings?.index);
      let maxResultWindow = parseInt(settings?.max_result_window?.toString() ?? '10000');
      let currentWindow = (search.size as number) + (search.from as number);
      // increase max result window for this index first
      if (currentWindow > maxResultWindow) {
        await process.esclient.indices.putSettings({ index, body: { "index": { "max_result_window": currentWindow } } });
      };
      // let esRes: SearchResponse<unknown, Record<string, AggregationsAggregate>>;
      let esRes = !!options?.forceAll ? await process.esclient.search({ ...search, size: maxResultWindow, from: 0 }) : await process.esclient.search(search);

      if (!!options?.forceAll && !!esRes.hits.hits.length) {
        while (true) {
          let temp = await process.esclient.search({ ...search, size: maxResultWindow, from: 0, search_after: esRes.hits.hits.at(-1)?.sort });
          esRes.hits.hits.push(...temp.hits.hits);
          if (!temp.hits.hits.length) break;
        }
      }

      if ((!esRes || !esRes.hits || !esRes.hits.hits.length) && !options?.next) {
        req.flash(`error ,${index} data not found in DB`);
        return next(new ApiError(404, `error ,${index} data not found in DB`));
      };

      if (!!Array.isArray(req.body["elasticsearchIndices"])) req.body["elasticsearchIndices"].push(index);
      else req.body["elasticsearchIndices"] = [index];

      let total = undefined;
      let data = esRes.hits.hits?.map((doc) => ({ "_id": doc._id, ...(doc._source ?? {}) }));

      if (!!options?.send?.call) data = await Promise.all(data.map((doc) => options?.send?.(doc, req)));
      if (!!options?.filter?.call) data = data.filter((doc) => options?.filter?.(doc, req));

      if (!!options?.filter?.call && !!options?.forceAll) {
        total = data.length;
        let start = ((page > 1 ? page : 1) - 1) * perPage;
        if (!options?.next) data = data.slice(start, start + perPage);
      } else {
        total = typeof (esRes.hits.total) === 'number' ? esRes.hits.total
          : esRes.hits.total?.value;
        // if (!options?.next) data.splice(0, search.from ?? 0);
      }


      if (options?.next) {
        req.body[options.save || 'esRes'] = data;
        req.body["esResTotal"] = total;
        return next();
      };

      return res.status(200).json({
        success: true,
        data,
        page,
        perPage,
        total,
        pages: Math.ceil((total ?? 0) / perPage),
      });
    } catch (err: any) {
      if (err.meta?.body?.error?.type === "index_not_found_exception") return next(new ApiError(500, "internal server error , " + err.message));
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};


/**
 * Middleware function to read a document by its ID from an Elasticsearch index.
 * 
 * This function is designed to be used as middleware in an Express.js application,
 * allowing for the retrieval of a specific document from an Elasticsearch index based on its ID.
 * The ID can be extracted from the request parameters, or provided directly as an argument, or from req.params.id.
 * 
 * @param {string} index_name - The name of the Elasticsearch index to search within.
 * @param {Object} [options] - Optional configuration object.
 * @param {boolean} [options.next=false] - If true, the middleware will pass control to the next middleware function in the stack without sending a response.
 * @param {(doc: unknown, req: Request) => any | void | Promise<any | void>} [options.send] - A callback function to process the document before sending the response or saving to a field.
 * @param {string} [options.save] - The key under which to save the document in the request body, if `options.next` is true.
 * @param {(req: Request) => string | undefined} [options.idFromReq] - A function to extract the document ID from the request, if not provided directly.
 * @param {string} [_id] - An optional direct ID to use for the document retrieval, overriding `options.idFromReq`.
 * 
 * @returns {RequestHandler} - An Express.js middleware function.
 * 
 * @example
 * // Usage in an Express.js route
 * app.get('/document/:id', readByIdElasticMiddleware('myIndex', { send: (doc) => doc }));
 */
export function readByIdElasticMiddleware(
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
      let query_elastic = {
        "index": typeof (index_name) === "function" ? index_name(req) : index_name,
        "query": {
          "term": {
            "_id": id
          }
        }
      };

      const esRes = await process.esclient.search(query_elastic);
      if ((!esRes || !esRes.hits || !esRes.hits.hits.length) && !options?.next) {
        req.flash(`error ,${index_name} data not found in DB`);
        return next(new ApiError(404, `error ,${index_name} data not found in DB`));
      };
      if (!!Array.isArray(req.body["elasticsearchIndices"])) req.body["elasticsearchIndices"].push(query_elastic.index);
      else req.body["elasticsearchIndices"] = [query_elastic.index];
      let doc = esRes.hits.hits[0];
      let data = !!options?.send ? options?.send({ "_id": doc?._id, ...(doc?._source ?? {}) }, req)
        : { "_id": doc?._id, ...(doc?._source ?? {}) }

      if (options?.next) {
        req.body[options?.save ?? 'esRes'] = data;
        return next();
      };

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      if (err.meta?.body?.error?.type === "index_not_found_exception") return next(new ApiError(500, "internal server error , " + err.message));
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};





