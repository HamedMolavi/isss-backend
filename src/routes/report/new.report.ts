import { Request, Router } from "express";
import { readByIdElasticMiddleware, readElasticMiddleware } from "../../db/elastic/read.logs";
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
import { stringPlateToJson } from "../../tools/plate.tools";
import { injectAllKindOfStuff } from "../../tools/middleware.tools";
import { platesToStrings } from "../../tools/car.tools";
import { SearchRequest } from "@elastic/elasticsearch/lib/api/typesWithBodyKey";
import { ApiError } from "../../types/classes/error.class";
import User from "../../db/mongo/models/user";

//create router for add to routes file
const router: Router = Router();
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
router.use('',
  readMiddleware(Camera, undefined, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera']), { spread: true }),
);
router.use('/:index(plate|search)/:id?',
  readMiddleware(Car, undefined, { forceAll: true, populate: true, forcePopulate: ["owner", "brand", "color"], next: true, save: "car" }),
  readMiddleware(CarColor, undefined, { forceAll: true, populate: true, forcePopulate: ["color"], next: true, save: "color" }),
  readMiddleware(CarBrand, undefined, { forceAll: true, populate: true, forcePopulate: ["brand"], next: true, save: "brand" }),
  injectDataMiddleware(injectAllKindOfStuff(['color', 'brand']), { spread: true }),
  injectDataMiddleware(injectAllKindOfStuff(['car'], "number_plate"), { spread: true }),
);
router.use('/:index(face)/:id?',
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["department_id"], next: true, save: "personnel" }),
  injectDataMiddleware(injectAllKindOfStuff(['personnel']), { spread: true }),
);
// Search //
router.get('/:index(plate|search|face|sabotage|human|objectdetection)',
  readElasticMiddleware((req) => ({
    "plate": process.env["PLATE_INDEX"] ?? "plate_log",
    "search": process.env["PLATE_INDEX"] ?? "plate_log",
    "face": process.env["FACE_INDEX"] ?? "face_log",
    "sabotage": process.env["SABOTAGE_INDEX"] ?? "sabotage_log",
    "objectdetection": process.env["OBJECT_INDEX"] ?? "objectdetection_log",
    "human": process.env["HUMAN_INDEX"] ?? "human_log"
  }[req.params.index]) as string, { send: sendFunction, searchFromReq: getSearchFunction, }),
);
router.get("/:index(plate|search|face|sabotage|human|objectdetection)/:id",
  readByIdElasticMiddleware((req) => ({
    "plate": process.env["PLATE_INDEX"] ?? "plate_log",
    "search": process.env["PLATE_INDEX"] ?? "plate_log",
    "face": process.env["FACE_INDEX"] ?? "face_log",
    "sabotage": process.env["SABOTAGE_INDEX"] ?? "sabotage_log",
    "objectdetection": process.env["OBJECT_INDEX"] ?? "objectdetection_log",
    "human": process.env["HUMAN_INDEX"] ?? "human_log"
  }[req.params.index] as string), { send: sendFunction }),
);
router.post("/:index(plate|search|face|sabotage|human|objectdetection)",
  readElasticMiddleware((req) => ({
    "plate": process.env["PLATE_INDEX"] ?? "plate_log",
    "search": process.env["PLATE_INDEX"] ?? "plate_log",
    "face": process.env["FACE_INDEX"] ?? "face_log",
    "sabotage": process.env["SABOTAGE_INDEX"] ?? "sabotage_log",
    "objectdetection": process.env["OBJECT_INDEX"] ?? "objectdetection_log",
    "human": process.env["HUMAN_INDEX"] ?? "human_log"
  }[req.params.index]) as string, {
    searchFromReq: postSearchFunction,
    send: sendFunction
  }),
);

function getSearchFunction(req: Request) {
  const accessList = req.user.role === 'admin' ? [] : !!req.user.camera_access?.length ? req.user.camera_access : ["who's daddy"]
  return {
    track_total_hits: true,
    query: {
      bool: {
        should: accessList?.map(value => ({
          match: {
            "camera_id": value.toString()
          }
        })),
        "minimum_should_match": 1
      }
    },
    sort: [{ timestamp: { order: "desc" } }]
  } as SearchRequest;
}

function postSearchFunction(req: Request) {
  const body = req.body;
  let timezone = body.timez ?? body.timezone;
  const times_epoch: Array<{ gte: number, lte: number }> = body.date_start && Time.getEpochList(body.date_start, body.date_end, body.time_start, body.time_end, timezone);
  let plates = !!body.plates ? platesToStrings(body.plates) : [];
  const userCameras = !!req.user.camera_access?.length ? req.user.camera_access?.map(el => el.toString()) : ["who's daddy"];
  const allowedSearchedCameras = body.cameras.filter((cam: any) => userCameras.includes(cam)).concat(["who's daddy"]);
  const cameras =
    req.user.role === 'admin' ? body.cameras :
      !!body.cameras.length ? allowedSearchedCameras :
        userCameras;
  const fields: { [key: string]: Array<any> } = {
    "plate_number": plates,
    "camera_id": cameras,
    "personnel_id": body.personnels,
    "brand": body.brands,
    "owner": body.owner,
    "color": body.colors,
    "human_count": body.human_count,
    "allowed": body.allowed === undefined || body.allowed === null ? [] : Array.isArray(body.allowed) ? body.allowed : [body.allowed]
  };
  const fieldQueries = Object.entries(fields).filter(([, values]) => !!values && values.length > 0).map(([field, values]) => ({
    bool: {
      should: values.map(value => ({
        match: {
          [`${field}`]: value
        }
      })),
      "minimum_should_match": 1
    }
  }));
  if (!!body.person_type && typeof body.person_type === 'string') {
    fieldQueries.push({
      //@ts-ignore
      "match": { "person_type": body.person_type }
    })
    fieldQueries.push({
      //@ts-ignore
      "exists": { "field": "person_type" },
    })
  }
  const timeQueries = !!times_epoch && !!times_epoch.length ? [{
    bool: { should: times_epoch.map(time => ({ range: { timestamp: { gte: time.gte, lte: time.lte } } })), "minimum_should_match": 1 }
  }] : [];
  const combinedQueries = [...fieldQueries, ...timeQueries];
  let query_elastic = {
    track_total_hits: true,
    query: {
      bool: {
        must: combinedQueries,
      }
    },
    sort: [{ timestamp: { order: "desc" } }]
  } as SearchRequest;
  return query_elastic;
};
function sendFunction(log: any, req: Request): any {

  try {
    const tmpFlag = ["plate_log", "objectdetection_log"].includes(req.body['elasticsearchIndices']?.at(-1));
    const crop = tmpFlag ? log?.crop : log?.inner_crop ?? '';
    const inner_crop = tmpFlag ? log?.inner_crop : "";
    const camera = log.camera_id ? req.body['camera'][log.camera_id] : undefined;
    const personnel = (log.personnel_id && log.personnel_id !== "unknown") ? req.body['personnel'][log.personnel_id] : undefined;
    const department = req.body['camera'][log.camera_id]?.section_id?.department_id?.name ?? "";
    const section = req.body['camera'][log.camera_id]?.section_id?.name ?? "";
    const color = log?.color ? req.body['color'][log.color] : undefined;
    const brand = log?.brand ? req.body['brand'][log.brand] : undefined;
    return {
      _id: log?._id,
      camera_type: camera?.camera_type ?? "",
      camera_id: camera?._id?.toString() ?? "",
      camera: camera?.name ?? "",
      camera_name: camera?.name ?? "",
      fullName: personnel?.toName() ?? "",
      department: personnel?.section_id?.department_id?.name ?? department,
      section: personnel?.section_id?.name ?? section,
      time: !!log?.timestamp ? new Date(log.timestamp).toLocaleString("en-US", { timeZone: req.query?.timezone?.toString() ?? "Asia/Tehran" }) : "",
      plate_number: log.plate_number ? stringPlateToJson(log.plate_number) : "",
      owner: log?.owner ?? "",
      color: color?.name ?? "",
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
      vector: log?.vector ?? ""
    };
  } catch (err: any) {
    console.error(err)
    return undefined;
  }
};

export default router;
