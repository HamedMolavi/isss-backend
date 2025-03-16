import { Request, Router } from "express";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import Camera from "../../db/mongo/models/camera";
import Time from "../../tools/time.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import CarBrand, { ICarBrand } from "../../db/mongo/models/carBrand";
import CarColor, { ICarColor } from "../../db/mongo/models/carColor";
import { injectDataMiddleware } from "../../tools/request.tools";
import { injectAllKindOfStuff } from "../../tools/middleware.tools";
import { ApiError } from "../../types/classes/error.class";
import { faceCols, plateCols, sendExcelMiddleware } from "../../tools/excel.tools";
import { isValidObjectId, isObjectIdOrHexString, FilterQuery, Document, Types } from "mongoose";
import { platesToStrings, plateToQueryJSON, stringPersianToStringEnglish, stringPlateToJson } from "../../tools/plate.tools";
import PlateReport from "../../db/mongo/models/plateReport";
import { IPlateReport } from "../../types/interfaces/plateReport.interface";
import { ICamera } from "../../types/interfaces/camera.interface";

//create router for add to routes file
const router: Router = Router();
const frame_index = process.env["FRAME_INDEX"] ?? "frame_log";
const importantFields = {
  "face": ["description", "name", "camera_name", "personnel_code"],
  "plate": ["description", "owner", "camera_name", function plate_number(input: string) { return stringPersianToStringEnglish(input) }]
}
// Validation //
router.post("/:index(plate)",
  Time.compareTimeMiddleware("start", "stop"),
);

router.use('', (req, res, next) => {
  Object.assign(req.body, { db_cameras: {}, db_brands: {}, db_colors: {} });
  next();
});
// Delete //
/*
router.delete('/:index(plate)',
  deleteElasticMiddleware(indexFunc),
);
router.delete('/:index(plate)/:id',
  deleteByIdElasticMiddleware(indexFunc, { send: sendFunction, }),
);
*/
// Search //
router.get('/:index(plate)(/:type(excel))?/?$',
  readMiddleware(PlateReport,
    undefined,
    {
      send: sendFunction,
      save: "esResult",
      next: (req: any) => !!req.params["type"]

    }
  ),
);
router.get('/:index(plate)/:type(excel)/?$',
  sendExcelMiddleware({ cols: colsFunc, rows: "esResult" })
);
router.get("/:index(plate)/:id?", // get with id
  readByIdMiddleware(PlateReport, {
    send: sendFunction,
    save: "esResult",
  }),
);
/////////////////////////////
router.post("/:index(plate)(/:type(excel))?/?$", // filter with body
  readMiddleware(PlateReport,
    search => JSON.parse(search),
    {
      searchFromBody: postSearchFunction, //postSearchFunction
      send: sendFunction,
      save: "esResult",
      next: (req) => !!req.params["type"]
    }
  )
);
router.post("/:index(plate)/:type(excel)/?$",
  sendExcelMiddleware({ cols: colsFunc, rows: "esResult" })
);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function postSearchFunction(body: any) {
  //---- Prepration
  let timezone = body.timez ?? body.timezone;
  const times_epoch: Array<{ gte: string, lte: string }> = body.date_start && Time.getEpochList(body.date_start, body.date_end, body.time_start, body.time_end, timezone);
  const cameras = body.cameras ?? [];
  const fields: { [key: string]: Array<any> } = {
    "camera_id": cameras,
    "brand": body.brands,
    "color": body.colors,
  };
  // Make clauses
  let query: FilterQuery<any> = {
    $and: [ // Between fields there are ANDs. This way for each field there is a must restriction.
      // In a field (for example cameras), between each possible value there are ORs.
      ...Object.entries(fields).filter(([, values]) => !!values && values.length > 0).map(([field, values]) => (
        {
          $or: [
            ...values.map(value => ({
              [`${field}`]: value
            })),
          ]
        })),
      // Time restriction
      ...(!!times_epoch && !!times_epoch.length ? [{
        $or: times_epoch.map(time => ({ timestamp: { $gte: parseInt(time.gte), $lt: parseInt(time.lte) } }))
      }] : []),

    ],
    // must_not: [],
    // should: []
  }
  // Plate search special clauses and alter other parts of query
  // if (body.plate_search_type === 'noplate') body.plates = [{ "first": "**", "second": "*", "third": "***", "fourth": "ایران", "fifth": "**" }];
  if (!!body.plates?.length) {
    let plates = platesToStrings(body.plates);
    query.$and?.push({ plate_number: plates[0] });
    //   let plate_search_type = body.plate_search_type ?? 'normal';
    //   query.$and?.push(
    //     {
    //       "$or": plates.map((plateString) => plateToQueryJSON(plateString, plate_search_type, { originalQueryToAlter: query })).flat(),
    //     }
    //   );
  }
  return JSON.stringify(query);
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function sendFunction(
  log: (Document<unknown, {}, IPlateReport> & IPlateReport & Required<{ _id: Types.ObjectId; }>),
  req: Request): Promise<any> {
  try {
    let camera: (Document<unknown, {}, ICamera> & ICamera & Required<{ _id: Types.ObjectId; }>) | null = null;
    if (Object.prototype.hasOwnProperty.call(req.body['db_cameras'], log.camera_id)) {
      camera = req.body?.['db_cameras']?.[log.camera_id];
    } else if (!!log.camera_id && isValidObjectId(log.camera_id)) {
      camera = await Camera.findById(log.camera_id).exec();
      Object.assign(req.body['db_cameras'], { [log.camera_id]: camera });
    }

    let color: (Document<unknown, {}, ICarColor> & ICarColor & Required<{ _id: Types.ObjectId; }>) | null = null;
    if (Object.prototype.hasOwnProperty.call(req.body['db_colors'], log.color)) {
      color = req.body?.['db_colors']?.[log.color];
    } else if (!!log.color && isValidObjectId(log.color)) {
      color = await CarColor.findById(log.color).exec();
      Object.assign(req.body['db_colors'], { [log.color]: color })
    }
    let brand: (Document<unknown, {}, ICarBrand> & ICarBrand & Required<{ _id: Types.ObjectId; }>) | null = null;
    if (Object.prototype.hasOwnProperty.call(req.body['db_brands'], log.brand)) {
      brand = req.body?.['db_brands']?.[log.brand];
    } else if (!!log.brand && isValidObjectId(log.brand)) {
      brand = await CarBrand.findById(log.brand).exec();
      Object.assign(req.body['db_brands'], { [log.brand]: brand })
    }

    return {
      type: "plate",
      allowed: true,
      alert: false,
      sms: false,
      description: "",

      camera_type: camera?.type ?? "",
      camera_id: camera?._id?.toString() ?? "",
      camera: camera?.name ?? "",
      camera_name: camera?.name ?? "",
      video: camera?.url ?? "",

      color: color?.name ?? "",
      fa_color: color?.fa_name ?? "",
      brand: brand?.name ?? "",
      fa_brand: brand?.fa_name ?? "",

      _id: log?._id,
      frame: log?.frame,
      time: !!log?.timestamp ? new Date(log.timestamp).toLocaleString("en-US", { timeZone: req.query?.timez?.toString() ?? "Asia/Tehran" }) : "",
      timestamp: log?.timestamp ?? "",
      plate_number: stringPlateToJson(log.plate_number),
      crop: log?.crop,
      inner_crop: log?.inner_crop,
      bbox: log.bbox,
      inner_bbox: log.inner_bbox,

    };
  } catch (err: any) {
    console.error(err)
    return undefined;
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function colsFunc(req: Request) {
  return {
    "plate": plateCols,
    "search": plateCols,
    "face": faceCols,
  }[req.params.index as "plate" | "search" | "face"]
};

export default router;
