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
 * @param {(body: { [key: string]: any }) => SearchRequest} [options.searchFromBody] - A function to construct the search request from the request body.
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
export function readElasticMiddlewareHamed(
  index_name: string | ((req: Request) => string),
  options?: {
    next?: boolean,
    save?: string,
    send?: (doc: unknown, req: Request) => any | void | Promise<any | void>,
    searchFromBody?: (body: { [key: string]: any }) => SearchRequest,
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

      let baseSearch: SearchRequest = {
        index: typeof (index_name) === "function" ? index_name(req) : index_name,
        size: perPage, from: (page - 1) * perPage,
        track_total_hits: true,
        sort: [{ timestamp: { order: "desc" } }]
      };
      let search: SearchRequest = { ...baseSearch, ...(options?.searchFromBody ?? options?.searchFromParams ?? options?.searchFromQuery)?.(req.body) }
      let sizeStepSearch = ((search.size as number) + (search.from as number) > 10000);
      let queryStepSearch = !!search.query;

      // let esRes: SearchResponse<unknown, Record<string, AggregationsAggregate>>;
      let esRes = !!(sizeStepSearch || queryStepSearch) ? await process.esclient.search({ ...search, size: 10000, from: 0 }) : await process.esclient.search(search);

      if (!!(sizeStepSearch || queryStepSearch) && !!esRes.hits.hits.length) {
        while (true) {
          search.size = !!sizeStepSearch ? (search.size as number) + (search.from as number) - 10000 : 10000;
          let temp = await process.esclient.search({ ...search, size: search.size > 10000 ? 10000 : search.size, from: 0, search_after: esRes.hits.hits.at(-1)?.sort });
          esRes.hits.hits.push(...temp.hits.hits);
          if (!temp.hits.hits.length || (sizeStepSearch && esRes.hits.hits.length >= (search.size as number) + (search.from as number))) break;
        }
      }

      if ((!esRes || !esRes.hits || !esRes.hits.hits.length) && !options?.next) {
        req.flash(`error ,${index_name} data not found in DB`);
        return next(new ApiError(404, `error ,${index_name} data not found in DB`));
      };
      // let data = (await Promise.all(esRes.hits.hits.map((doc) => !!options?.send ? options.send({ "_id": doc._id, ...(doc._source ?? {}) }, req) : { "_id": doc._id, ...(doc._source ?? {}) }))).filter((doc) => doc !== undefined);
      let total = undefined;
      let data = esRes.hits.hits?.map((doc) => ({ "_id": doc._id, ...(doc._source ?? {}) }));

      if (!!options?.send?.call) {
        data = (await Promise.all(data.map((doc) => options.send?.(doc, req)))).filter((doc) => doc !== undefined);
        total = data.length;
        let start = ((page > 1 ? page : 1) - 1) * perPage;
        if (!options?.next) data = data.slice(start, start + perPage);
      } else {
        total = typeof (esRes.hits.total) === 'number' ? esRes.hits.total
          : esRes.hits.total?.value;
          if (!!sizeStepSearch && !options?.next) data.splice(0, search.from ?? 0);
      }

      if (options?.next) {
        req.body[options.save || 'esRes'] = data;
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
  index_name: string,
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
        "index": index_name,
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

      let doc = esRes.hits.hits[0];
      let data = !!options?.send ? options.send({ "_id": doc?._id, ...(doc?._source ?? {}) }, req)
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


export function readElasticMiddleware(
  index_name: string,
  options?: {
    next?: boolean,
    send?: (doc: unknown, req: Request) => any | void | Promise<any | void>,
    save?: string,
    forceAll?: boolean,
  }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {

      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = strPerPage?.toLowerCase() === "all"
        ? 10000
        : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

      let _timezone = req.query.timez as string;
      const { body } = req;

      const start = body.date_start && String(Time.toTimestamp(body.date_start, body.time_start));
      const end = body.date_end && String(Time.toTimestamp(body.date_end, body.time_end));
      const times_epoch = body.date_start && Time.getEpochList(body.date_start, body.date_end, body.time_start, body.time_end, _timezone);
      let plates = !!req.body.plates ? platesToStrings(req.body.plates) : [];

      const esRes = await getLogFromElastic(index_name, !!options?.forceAll ? 10000 : perPage, !!options?.forceAll ? 0 : page,
        times_epoch ?? [], plates ?? [], body.cameras ?? [],
        body.car_brand ?? [], body.car_color ?? [], body.personnels ?? [],
        body.human_count ?? [], body.allowed ?? []
      );

      if ((!esRes || !esRes.hits || !esRes.hits.hits.length) && !options?.next) {
        req.flash("error , not found plate data in DB");
        return next(new ApiError(404, "error , not found plate data in DB"));
      };

      const entities = ['camera', 'personnel', 'color', 'brand'].reduce((acc, entity) => {
        acc[entity] = body[entity]?.reduce((obj: any, item: any) => ({ ...obj, [item._id.toString()]: item }), {});
        return acc;
      }, {} as Record<string, any>);

      let cars: [PapulatedCar] = req.body["car"];
      let objectedCars = !!cars && cars.reduce((pre, car) => {
        return { ...pre, [car.number_plate.toString()]: car };
      }, {} as { [key: string]: PapulatedCar });

      let data = esRes.hits.hits.map((hit: SearchHit<any>) => {
        const log = hit._source;
        if (!log) return {};
        // Check if log.plate_number is null or undefined before accessing properties
        const carDetails = log.plate_number ? objectedCars[log.plate_number] : null;
        return {
          _id: hit?._id ?? randomUuid(36),
          camera: log.camera_id ? entities['camera'][log.camera_id] : null,
          section: entities['camera'][log.camera_id]?.section_id?.name ?? "",
          //  section: entities['camera'][log.camera_id]["section_id"]["name"] ?? "",
          //  department: entities['camera'][log.camera_id]["section_id"]["department_id"]["name"] ?? "",
          department: entities['camera'][log.camera_id]?.section_id?.department_id?.name ?? "",
          personnel: (log.personnel_id && log.personnel_id !== "unknown") ? entities['personnel'][log.personnel_id] : null,
          timestamp: typeof log.timestamp === "string" ? Number(log.timestamp) : log.timestamp,
          plate_number: log.plate_number ?? null,
          owner: !!carDetails ? carDetails?.owner : null,
          color: log?.color ? entities['color'][log.color] : null,
          brand: log?.brand ? entities['brand'][log.brand] : null,
          allowed: log.allowed,
          alert: log.alert ?? null,
          sms: log.sms ?? null,
          description: log.description ?? "",
          human_count: log.human_count ?? 0,
          //llowed: carDetails?.camera_whitelist?.includes(new mongoose.Types.ObjectId(log.camera_id)) ?? false,
          crop: index_name === "plate_log" ? log?.crop : log?.inner_crop,
          inner_crop: index_name === "plate_log" ? log?.inner_crop : "",
        };
      });
      let total = undefined;
      if (!!options?.send?.call) {
        data = (await Promise.all(data.map((doc) => options.send?.(doc, req)))).filter((doc) => doc !== undefined);
        if (!!options.forceAll) {
          total = data.length;
          let start = ((page > 1 ? page : 1) - 1) * perPage;
          data = data.slice(start, start + perPage);
        }
        else total = typeof (esRes.hits.total) === 'number' ? esRes.hits.total : esRes.hits.total?.value;
      } else {
        total = typeof (esRes.hits.total) === 'number' ? esRes.hits.total
          : esRes.hits.total?.value;
      }

      if (options?.next) {
        req.body[options.save || 'docs'] = data;
        return next();
      };

      return res.status(200).json({
        success: true,
        data,
        page,
        perPage,
        total: total ?? data.length,
        pages: Math.ceil((total ?? data.length) / perPage),
      });
    } catch (err: any) {
      if (err.meta?.body?.error?.type === "index_not_found_exception") return next(new ApiError(500, "internal server error , " + err.message));
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};



export function filterLogsMiddleware(
  options?: {
    next?: boolean,
    save?: string,
  }): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    let filter_json: Report = {
      // brand: undefined,
      // color: undefined,
      owner: undefined,
    };
    try {
      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) >= 0 ? parseInt(strPage) : 0;
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = strPerPage?.toLowerCase() === "all"
        ? 10000
        : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
      const keys = Object.keys(filter_json).filter((k) => (
        !!req.body[k] && (
          (Array.isArray(req.body[k]) && !!req.body[k].length) ||
          (typeof req.body[k] === "string" && !!req.body[k]) ||
          (typeof req.body[k] === "boolean")
        )
      ))
      let data: any;
      if (!!keys.length) {
        data = req.body.logs.filter((log: any) => {
          for (let key of keys) {
            // TODO req.body.plates
            if (!!log[key]) { // permitted to filter
              if (Array.isArray(req.body[key])) { // input (req.body[key]) type array
                if (req.body[key]?.includes(log[key]?._id.toString())) return true;
              }
              else if (!Array.isArray(req.body[key])) { // input (req.body[key]) type array
                if (log[key] === req.body[key]) return true;
              }
              //  key === "plate" ? req.body?.plate = plate_number_engglish(req.body?.plate) : 
            }
          }
          return false;
        });
      }
      else data = req.body.logs;
      //  console.time("Execution Time");

      //   console.timeEnd("Execution Time filter");
      if (!!options?.next) {
        if (!!options.save) req.body[options.save] = data;
        else req.body["docs"] = data;
        return next();
      };

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

export function sendLogMiddleware(log: any, req: Request): any {
  try {
    let filter_json: Report = {
      // brand: undefined,
      // color: undefined,
      owner: undefined,
    };

    const keys = Object.keys(filter_json).filter((k) => (
      !!req.body[k] && (
        (Array.isArray(req.body[k]) && !!req.body[k].length) ||
        (typeof req.body[k] === "string" && !!req.body[k]) ||
        (typeof req.body[k] === "boolean")
      )
    ))
    let pass = false;
    if (!!keys.length) {
      for (let key of keys) {
        // TODO req.body.plates
        if (!!log[key]) { // permitted to filter
          if (Array.isArray(req.body[key])) { // input (req.body[key]) type array
            if (req.body[key]?.includes(log[key]?._id.toString())) pass = true;
          }
          else if (!Array.isArray(req.body[key])) { // input (req.body[key]) type array
            if (log[key] === req.body[key]) pass = true;
          }
          //  key === "plate" ? req.body?.plate = plate_number_engglish(req.body?.plate) : 
        }
      }
      if (!pass) return undefined;
    }
    return {
      _id: log?._id,
      camera_type: log.camera?.camera_type ?? "",
      camera_id: log.camera?._id?.toString(),
      camera: log.camera?.name ?? "",
      fullName: log.personnel?.toName() ?? "",
      time: log?.timestamp ? new Date(log.timestamp).toLocaleString("en-US", { timeZone: req.query?.timezone?.toString() ?? "Asia/Tehran" }) : "",
      plate_number: log.plate_number ? stringPlateToJson(log.plate_number) : "",
      owner: log?.owner?.toName() ?? "",
      color: log?.color?.name ?? "",
      brand: log?.brand?.name ?? "",
      department: log.personnel?.section_id?.department_id?.name ?? log?.department,
      section: log.personnel?.section_id?.name ?? log?.section,
      allowed: log.allowed,
      crop: log?.crop,
      video: log.camera?.url ?? "",
      inner_crop: log.inner_crop ?? "",
      alert: log.alert ?? null,
      sms: log.alert ?? null,
      description: log.description ?? "",
      human_count: log.human_count ?? 0,
    };
  } catch (err: any) {
    console.error(err)
    return undefined;
  }
};

function stringPlateToJson(plate_number: string) {
  let plateNumber1 = !!plate_number.substr(0, 2).match(new RegExp(/\*/)) ? plate_number.substr(0, 2) : Number(plate_number.substr(0, 2)).toLocaleString("fa-IR");
  let plateNumber2 = !!plate_number.substr(2, 1).match(new RegExp(/\*/)) ? plate_number.substr(2, 1) : persianPlateDict[plate_number.substr(2, 1)];
  let plateNumber3 = !!plate_number.substr(3, 3).match(new RegExp(/\*/)) ? plate_number.substr(3, 3) : Number(plate_number.substr(3, 3)).toLocaleString("fa-IR");
  let plateNumber4 = !!plate_number.substr(6, 2).match(new RegExp(/\*/)) ? plate_number.substr(6, 2) : Number(plate_number.substr(6, 2)).toLocaleString("fa-IR");
  //add plate number to json response for sort persian format in font end
  return {
    first: plateNumber1,
    second: plateNumber2,
    third: plateNumber3,
    fourth: "ایران",
    fifth: plateNumber4,
  };
}


function platesToStrings(plates: Array<{ [key: string]: string }>) {
  let results: string[]
  if (!plates.every((plate) => Object.values(plate).reduce((pre, curr) => pre + (!!curr ? 1 : 0), 0))) return []
  results = plates.map(plate => {
    // all of fields are there
    return `${plate.first}${englishPlateDict[plate.second]}${plate.third}${plate.fifth}`;
  })

  return results;
}
