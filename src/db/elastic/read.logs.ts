import { NextFunction, RequestHandler, Request, Response } from 'express';
import mongoose, { ObjectId } from 'mongoose';
import { ApiError } from '../../types/classes/error.class';
import { SearchHit, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
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
      let perPage = strPerPage?.toLowerCase() === "all"
        ? 10000
        : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

      let baseSearch: SearchRequest = {
        index: typeof (index_name) === "function" ? index_name(req) : index_name, size: perPage, from: page,
        sort: [{ timestamp: { order: "desc" } }]
      };
      let search: SearchRequest = { ...baseSearch, ...options?.searchFromBody?.(req.body) }
        ?? { ...baseSearch, ...options?.searchFromParams?.(req.params) }
        ?? { ...baseSearch, ...options?.searchFromQuery?.(req.query) } ?? { ...baseSearch };

      const esRes = await process.esclient.search(search);

      if ((!esRes || !esRes.hits || !esRes.hits.hits.length) && !options?.next) {
        req.flash(`error ,${index_name} data not found in DB`);
        return next(new ApiError(404, `error ,${index_name} data not found in DB`));
      };
      let data = (await Promise.all(esRes.hits.hits.map((doc) => !!options?.send ? options.send({ "_id": doc._id, ...(doc._source ?? {}) }, req) : { "_id": doc._id, ...(doc._source ?? {}) }))).filter((doc) => doc !== undefined);

      if (options?.next) {
        req.body[options.save || 'esRes'] = data;
        return next();
      };

      return res.status(200).json({
        success: true,
        data,
        page,
        perPage,
        total: data.length,
        pages: Math.ceil((data.length) / perPage),
      });
    } catch (err: any) {
      if (err.meta?.body?.error?.type === "index_not_found_exception") return next(new ApiError(500, "internal server error , " + err.message));
      return next(new ApiError(500, "internal server error , " + err.message));
    }
  }
};



export function readByIdElasticMiddleware(
  index_name: string,
  options?: {
    next?: boolean,
    send?: (doc: unknown, req: Request) => any | void | Promise<any | void>,
    save?: string,
  }, _id?: string): RequestHandler {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      let _timezone = req.query.timez as string;
      let id: string = _id ?? req.params.id;
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
      let data = !!options?.send ? options.send({ "_id": doc._id, ...(doc._source ?? {}) }, req)
        : { "_id": doc._id, ...(doc._source ?? {}) }
      
      if (options?.next) {
        req.body[options?.save ?? 'docs'] = data;
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
    save?: string,
    populate?: boolean,
    forcePopulate?: string[],
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

      let plates = !!req.body.plates ? platesToStrings(req.body.plates) : []
      const esRes = await getLogFromElastic(index_name, perPage, page,
        times_epoch || [], plates || [], body.cameras || [],
        body.car_brand || [], body.car_color || [], body.personnels || []
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

      const data = esRes.hits.hits.map((hit: SearchHit<any>) => {
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
          //llowed: carDetails?.camera_whitelist?.includes(new mongoose.Types.ObjectId(log.camera_id)) ?? false,
          crop: index_name === "plate_log" ? log?.crop : log?.inner_crop,
          inner_crop: index_name === "plate_log" ? log?.inner_crop : "",
        };
      });

      if (options?.next) {
        req.body[options.save || 'docs'] = data;
        return next();
      };

      return res.status(200).json({
        success: true,
        data,
        page,
        perPage,
        total: data.length,
        pages: Math.ceil((data.length) / perPage),
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
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
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

export function sendLogMiddleware(
  options?: {
    next?: boolean,
    save?: string
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
      //  console.time("Execution Time");
      const data = req.body.logs?.map((log: any) => {
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
        };
      });
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
