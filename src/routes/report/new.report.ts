import { Request, Router } from "express";
import { readByIdElastic, readByIdElasticMiddleware, readElasticMiddleware } from "../../db/elastic/read.logs";
import { readMiddleware } from "../../db/mongo/read.database";
import Camera from "../../db/mongo/models/camera";
import Personnel from "../../db/mongo/models/personnel";
import Car from "../../db/mongo/models/car";
import Time from "../../tools/time.tools";
import { dtoValidationMiddleware } from "../../validation/dto";
import { ReportFaceBody, ReportHumanBody, ReportObjectBody, ReportPlateBody } from "../../validation/dto/report.dto";
import CarBrand from "../../db/mongo/models/carBrand";
import CarColor from "../../db/mongo/models/carColor";
import { injectDataMiddleware } from "../../tools/request.tools";
import { stringPersianToStringEnglish, stringPlateToJson } from "../../tools/plate.tools";
import { injectAllKindOfStuff } from "../../tools/middleware.tools";
import { platesToStrings } from "../../tools/car.tools";
import { SearchRequest } from "@elastic/elasticsearch/lib/api/typesWithBodyKey";
import { ApiError } from "../../types/classes/error.class";
import User from "../../db/mongo/models/user";
import { deleteByIdElasticMiddleware, deleteElasticMiddleware } from "../../db/elastic/delete.logs";
import { faceCols, plateCols, sendExcelMiddleware } from "../../tools/excel.tools";
import { isValidObjectId, isObjectIdOrHexString } from "mongoose";
import Section from "../../db/mongo/models/section";
import Department from "../../db/mongo/models/department";
import PersonImage from "../../db/mongo/models/personImage";
import { plateToQueryJSON } from "../../tools/elastic.tools";
import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";

//create router for add to routes file
const router: Router = Router();
const frame_index = process.env["FRAME_INDEX"] ?? "frame_log";
const importantFields = {
  "face": ["description", "name", "camera_name", "personnel_code"],
  "plate": ["description", "owner", "camera_name", function plate_number(input: string) { return stringPersianToStringEnglish(input) }]
}
// Validation //
router.post("/:index(plate|search|face|sabotage|human|objectdetection)",
  (req, res, next) => {
    if (!["plate", "search", "face", "sabotage", "human", "objectdetection"].includes(req.params.index)) return next(new ApiError(404, `Index ${req.params.index} not found!`))
    const dtoClass: { [key: string]: any } = {
      "plate": ReportPlateBody, "search": ReportPlateBody, "face": ReportFaceBody, "sabotage": ReportFaceBody, "human": ReportHumanBody, "objectdetection": ReportObjectBody
    };
    dtoValidationMiddleware(dtoClass[req.params.index], { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" })(req, res, next)
  },
  Time.compareTimeMiddleware("start", "stop"),
);
// Inject Data //
// router.use('',
//   readMiddleware(Camera, undefined, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
//   injectDataMiddleware(injectAllKindOfStuff(['camera']), { spread: true }),
// );
// router.use('/:index(plate|search)/:id?',
//   readMiddleware(Car, undefined, { forceAll: true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
//   readMiddleware(CarColor, undefined, { forceAll: true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
//   readMiddleware(CarBrand, undefined, { forceAll: true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
//   injectDataMiddleware(injectAllKindOfStuff(['color', 'brand']), { spread: true }),
//   injectDataMiddleware(injectAllKindOfStuff(['car'], "number_plate"), { spread: true }),
// );
// router.use('/:index(face)/:id?',
//   readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["department_id"], next: true, save: "personnel" }),
//   injectDataMiddleware(injectAllKindOfStuff(['personnel']), { spread: true }),
// );
router.use('', (req, res, next) => {
  Object.assign(req.body, { db_cameras: {}, db_personnel: {}, db_person_image: {}, db_brands: {}, db_colors: {}, db_sections: {}, db_departments: {} });
  next();
});
// Delete //
router.delete('/:index(plate|search|face|sabotage|human|objectdetection)',
  deleteElasticMiddleware(indexFunc),
);
router.delete('/:index(plate|search|face|sabotage|human|objectdetection)/:id',
  deleteByIdElasticMiddleware(indexFunc, { send: sendFunction, }),
);
// Search //
router.get('/:index(plate|search|face|sabotage|human|objectdetection)(/:type(excel))?/?$', // total get
  readElasticMiddleware(indexFunc, {
    send: sendFunction,
    save: "esResult",
    searchFromReq: getSearchFunction,
    next: (req) => !!req.params["type"]
  }),
);
router.get('/:index(plate|search|face)/:type(excel)/?$',
  sendExcelMiddleware({ cols: colsFunc, rows: "esResult" })
);
router.get("/:index(plate|search|face|sabotage|human|objectdetection)/:id?/:type(excel)?", // get with id
  readByIdElasticMiddleware(indexFunc, {
    send: sendFunction,
    save: "esResult",
    next: (req) => !!req.params["type"]
  }),
);
router.get("/:index(plate|search|face)/:id?/:type(excel)?",
  sendExcelMiddleware({ cols: colsFunc, rows: "esResult" })
);

router.post("/:index(plate|search|face|sabotage|human|objectdetection)(/:type(excel))?/?$", // filter with body
  readElasticMiddleware(indexFunc, {
    searchFromReq: postSearchFunction,
    send: sendFunction,
    save: "esResult",
    next: (req) => !!req.params["type"]
  })
);
router.post("/:index(plate|search|face)/:type(excel)/?$",
  sendExcelMiddleware({ cols: colsFunc, rows: "esResult" })
);

router.post('/:index(plate|face)/backup', // backup & delete true
  deleteElasticMiddleware(indexFunc, {
    sendDocsInsteadOfDeleteResult: true,
    send: sendFunction,
    save: "esResult",
    next: true
  }),
  sendExcelMiddleware({ cols: colsFunc, rows: "esResult" })
);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function getSearchFunction(req: Request) {
  const accessList = req.user.role === 'admin' ? [] : !!req.user.camera_access?.length ? req.user.camera_access : ["who's daddy"]
  return {
    track_total_hits: true,
    query: {
      "bool": {
        "must": [
          {
            "bool": { // ensure camera access for user
              "should": accessList?.map(value => ({
                match: {
                  "camera_id": value.toString()
                }
              })),
              "minimum_should_match": 1
            }
          },
          {
            "bool": { // search if provided
              "should": typeof req.query?.search === 'string' && !!req.query.search && typeof req.params.index === 'string' && Object.prototype.hasOwnProperty.call(importantFields, req.params.index)
                ? (importantFields[req.params.index as keyof typeof importantFields]).map((el: string | ((input: string) => string)) => ({
                  "regexp": {
                    [typeof el === 'string' ? el : el.name]: { "value": ".*" + (typeof el === 'function' ? el(req.query.search as string) : req.query.search) + ".*", "case_insensitive": true }
                  }
                }))
                : [],
              "minimum_should_match": 1
            }
          }
        ]
      }
    },
    sort: [{ timestamp: { order: "desc" } }]
  } as SearchRequest;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function postSearchFunction(req: Request) {
  let score: { script?: string, min_score?: number } = {};
  let query: QueryDslQueryContainer & { bool: { must: QueryDslQueryContainer[], must_not: QueryDslQueryContainer[], should: QueryDslQueryContainer[] } };
  //---- Prepration
  const body = req.body;
  let timezone = body.timez ?? body.timezone;
  const times_epoch: Array<{ gte: number, lte: number }> = body.date_start && Time.getEpochList(body.date_start, body.date_end, body.time_start, body.time_end, timezone);
  const userCameras = !!req.user.camera_access?.length ? req.user.camera_access?.map(el => el.toString()) : ["who's daddy"];
  const allowedSearchedCameras = body.cameras?.filter((cam: any) => userCameras.includes(cam)).concat(["who's daddy"]);
  const cameras =
    (req.user.role === 'admin' ? body.cameras :
      !!body.cameras?.length ? allowedSearchedCameras :
        userCameras) ?? [];
  const fields: { [key: string]: Array<any> } = {
    "camera_id": cameras,
    "personnel_id": body.personnels,
    "brand": body.brands,
    "owner": body.owner,
    "color": body.colors,
    "human_count": body.human_count,
    "allowed": body.allowed === undefined || body.allowed === null ? [] : Array.isArray(body.allowed) ? body.allowed : [body.allowed]
  };

  // Make clauses
  query = {
    bool: {
      must: [ // Between fields there are ANDs. This way for each field there is a must restriction.
        ...Object.entries(fields).filter(([, values]) => !!values && values.length > 0).map(([field, values]) => (
          {
            bool: {
              should: [ // In a field (for example cameras), between each possible value there are ORs.
                ...values.map(value => ({
                  match: {
                    [`${field}`]: value
                  }
                })),
              ],
              "minimum_should_match": 1
            }
          })),

        ...(!!times_epoch && !!times_epoch.length ? [{
          bool: { should: times_epoch.map(time => ({ range: { timestamp: { gte: time.gte, lte: time.lte } } })), "minimum_should_match": 1 }
        }] : []),

        ...(!!body.person_type && typeof body.person_type === 'string' ? [
          { "match": { "person_type": body.person_type } }, { "exists": { "field": "person_type" } }
        ] : []),
      ],
      must_not: [],
      should: []
    }
  }
  // Plate search special clauses and alter other parts of query
  if (body.plate_search_type === 'noplate') body.plates = [{ "first": "**", "second": "*", "third": "***", "fourth": "ایران", "fifth": "**" }];
  if (!!body.plates?.length) {
    let plates = platesToStrings(body.plates);
    let plate_search_type = body.plate_search_type ?? 'normal';
    query?.bool?.must?.push(
      {
        "bool": { // each field => they have to be OR
          "should": plates.map((plateString) => plateToQueryJSON(plateString, plate_search_type, { originalQueryToAlter: query })).flat(),
          "minimum_should_match": 1
        }
      }
    );
  }

  let query_elastic = {
    track_total_hits: true,
    sort: [{ timestamp: { order: "desc" } }],
    query
  } as SearchRequest;
  return query_elastic;
};


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function sendFunction(log: any, req: Request): Promise<any> {
  try {
    const tmpFlag = ["plate_log", "objectdetection_log"].includes(req.body['elasticsearchIndices']?.at(-1));
    const crop = tmpFlag ? log?.crop : log?.inner_crop ?? '';
    const inner_crop = tmpFlag ? log?.inner_crop : "";

    let camera: any = undefined;
    let sectionDoc: any = undefined;
    let departmentDoc: any = undefined;
    if (Object.prototype.hasOwnProperty.call(req.body['db_cameras'], log.camera_id)) {
      camera = req.body?.['db_cameras']?.[log.camera_id];
      sectionDoc = req.body?.['db_sections']?.[log.camera_id];
      departmentDoc = req.body?.['db_departments']?.[log.camera_id];
    } else if (!!log.camera_id && isValidObjectId(log.camera_id)) {
      camera = await Camera.findById(log.camera_id).exec();
      Object.assign(req.body['db_cameras'], { [log.camera_id]: camera });
      if (!!camera) {
        sectionDoc = await Section.findById(camera.section_id).exec();
        Object.assign(req.body['db_sections'], { [log.camera_id]: sectionDoc });
        if (!!sectionDoc) {
          departmentDoc = !!sectionDoc?.department_id ? await Department.findById(sectionDoc?.department_id).exec() : undefined;
          Object.assign(req.body['db_departments'], { [log.camera_id]: departmentDoc })
        }
      }
    }
    const section = sectionDoc?.name ?? "";
    const department = departmentDoc?.name ?? "";

    let personnel: any = undefined;
    const log_personnel_id = log.type === "plate" ? log?.owner
      : log.type === "face" ? log?.personnel_id
        : "unknown";
    if (Object.prototype.hasOwnProperty.call(req.body['db_personnel'], log_personnel_id)) {
      personnel = req.body?.['db_personnel']?.[log_personnel_id];
    } else if (!!log_personnel_id && log_personnel_id !== "unknown" && isValidObjectId(log_personnel_id)) {
      personnel = await Personnel.findById(log_personnel_id).exec();
      Object.assign(req.body['db_personnel'], { [log_personnel_id]: personnel });
    }

    let hash_id = undefined;
    if (!!log?.hash_id) hash_id = log.hash_id;
    else if (Object.prototype.hasOwnProperty.call(req.body['db_person_image'], log.image_id)) {
      const image = req.body?.['db_person_image']?.[log.image_id];
      hash_id = image?.hash_id;
    } else if (!!log.image_id && isValidObjectId(log.image_id)) {
      const image = await PersonImage.findById(log.image_id).exec();
      Object.assign(req.body['db_person_image'], { [log.image_id]: image })
      hash_id = image?.hash_id;
    }

    let color = undefined;
    if (Object.prototype.hasOwnProperty.call(req.body['db_colors'], log.color)) {
      color = req.body?.['db_colors']?.[log.color];
    } else if (!!log.color && isValidObjectId(log.color)) {
      color = await CarColor.findById(log.color).exec();
      Object.assign(req.body['db_colors'], { [log.color]: color })
    }
    let brand = undefined;
    if (Object.prototype.hasOwnProperty.call(req.body['db_brands'], log.brand)) {
      brand = req.body?.['db_brands']?.[log.brand];
    } else if (!!log.brand && isValidObjectId(log.brand)) {
      brand = await CarBrand.findById(log.brand).exec();
      Object.assign(req.body['db_brands'], { [log.brand]: brand })
    }

    const frame_log = !!log?.frame_id ? await readByIdElastic(frame_index, log.frame_id) : {};
    delete frame_log["_id"]
    delete frame_log["personnel_id"]
    return {
      _id: log?._id,
      type: log?.type,
      camera_type: camera?.camera_type ?? "",
      camera_id: camera?._id?.toString() ?? "",
      camera: camera?.name ?? "",
      camera_name: camera?.name ?? "",
      fullName: personnel?.toName() ?? log.name ?? "",
      personnel_id: personnel?.id ?? "unknown",
      ...frame_log,
      // frame: !!log?.frame_id ? await readByIdElastic(frame_index, log.frame_id) : "",
      // department: personnel?.section_id?.department_id?.name ?? department,
      department,
      // section: personnel?.section_id?.name ?? section,
      section,
      time: !!log?.timestamp ? new Date(log.timestamp).toLocaleString("en-US", { timeZone: req.query?.timez?.toString() ?? "Asia/Tehran" }) : "",
      plate_number: stringPlateToJson(log.plate_number),
      owner: log?.owner ?? "",
      color: color?.name ?? "",
      fa_color: color?.fa_name ?? "",
      brand: brand?.name ?? "",
      allowed: log.allowed,
      crop: crop,
      video: camera?.url ?? "",
      inner_crop: inner_crop,
      alert: log?.alert,
      sms: log?.sms,
      description: log.description ?? "",
      human_count: log.human_count ?? 0,
      timestamp: log?.timestamp ?? "",
      confidence: log?.confidence ?? "",
      image_id: log?.image_id ?? "",
      hash_id: hash_id ?? "",
      face_confidence: log?.face_confidence ?? "",
      vector: log?.vector ?? ""
    };
  } catch (err: any) {
    console.error(err)
    return undefined;
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function indexFunc(req: Request) {
  return {
    "plate": process.env["PLATE_INDEX"] ?? "plate_log",
    "search": process.env["PLATE_INDEX"] ?? "plate_log",
    "face": process.env["FACE_INDEX"] ?? "face_log",
    "sabotage": process.env["SABOTAGE_INDEX"] ?? "sabotage_log",
    "objectdetection": process.env["OBJECT_INDEX"] ?? "objectdetection_log",
    "human": process.env["HUMAN_INDEX"] ?? "human_log"
  }[req.params.index] as string
};
function colsFunc(req: Request) {
  return {
    "plate": plateCols,
    "search": plateCols,
    "face": faceCols,
  }[req.params.index as "plate" | "search" | "face"]
};

export default router;
