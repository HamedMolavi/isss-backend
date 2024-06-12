import { Request, Router } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { ReadSimilarVectorsBody } from "../../validation/dto/similarity.dto";
import { cosineSimilarity } from "../../tools/utils.tools";
import { readByIdElasticMiddleware, readElasticMiddleware } from "../../db/elastic/read.logs";
import { ApiError } from "../../types/classes/error.class";
import { injectDataMiddleware } from "../../tools/request.tools";
import { readMiddleware } from "../../db/mongo/read.database";
import Camera from "../../db/mongo/models/camera";
import Personnel from "../../db/mongo/models/personnel";
import { dataCollector, injectAllKindOfStuff, sendDataMiddleware, unifiedSendFunction } from "../../tools/middleware.tools";
import { cumulativeSendFunction, daySendFunction } from "../../tools/track.tools";
import Time from "../../tools/time.tools";
import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";


//create router for add to routes file
const router: Router = Router();

// DTO check in post requests
router.post('/:type(tree|table|cumulative)',
  dtoValidationMiddleware(ReadSimilarVectorsBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
)
// Inject Camera and Personnel data from mongo to populate the elastic log with their info
router.use('/table/:id?',
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'personnel']), { spread: true }),
)
// Read the log or get vector from body
router.use('/:type(tree|table|cumulative)/:id?',
  readByIdElasticMiddleware(`${process.env["FACE_INDEX"] ?? "face_log"}`, {
    next: true, save: "targetVector",
    idFromReq: (req) => req.body?.["log_id"], // if log_id is provided in body, otherwise return undefined to read from req.params.id
    send: (log: any, req) => {
      let targetVector = !!log?._id ? log?.["vector"] : req.body?.["vector"];
      if (!Array.isArray(targetVector) || targetVector.length !== 512 || !targetVector.every((num) => typeof (num) === "number")) throw Error("Target face log has disordered vector!");
      return targetVector;
    }
  }),
)
// Read Elastic logs in specified range and send it
router.use('/table/:id?',
  readElasticMiddleware(`${process.env["FACE_INDEX"] ?? "face_log"}`, {
    forceAll: true,
    searchFromBody: searchFunction,
    send: unifiedSendFunction
  })
)
router.use('/:type(tree|cumulative)/:id?',
  readElasticMiddleware(`${process.env["FACE_INDEX"] ?? "face_log"}`, {
    searchFromBody: searchFunction,
    forceAll: true, save: "similars", next: true,
  }),
  injectDataMiddleware((body: any) => dataCollector(body["similars"] ?? []), { injData: "trackData" }),
  readMiddleware(Camera, undefined, { next: true, forceAll: true, save: "cameras" }),
)
router.use('/tree/:id?',
  sendDataMiddleware((body: any) => body["trackData"]?.map((track: any) => daySendFunction(track, { body, "query": { "timezone": body.timezone as string | undefined } } as unknown as Request)), { forceAll: true })
)
router.use('/cumulative/:id?',
  injectDataMiddleware((body: any) => {
    if (!!body?.["date_start"] && !!body?.["date_start"]) {
      let start = Math.floor((new Date(body.date_start + Time.getUtcOffset("Asia/Tehran").toString().replace("+", " "))).getTime() / 86400000)
      let end = Math.floor((new Date(body.date_end + Time.getUtcOffset("Asia/Tehran").toString().replace("+", " "))).getTime() / 86400000)
      return {
        "day_start": start,
        "day_end": end
      }
    } else {
      let sortedData: any = body?.trackData?.sort((a: any, b: any) => (a.day ?? 0) - (b.day ?? 0))
      return {
        "day_start": (sortedData?.at(0)?.day ?? 0),
        "day_end": (sortedData?.at(-1)?.day ?? 0) + 1
      }
    }
  }, { spread: true }),
  sendDataMiddleware(cumulativeSendFunction, { forceAll: true })
)


function searchFunction(body: any) {
  const threshold = Number(body["threshold"] ?? 50) / 100;
  let query: QueryDslQueryContainer = { "match_all": {} };
  if (!!body?.["date_start"] || !!body?.["date_end"]) {
    let start = (new Date(body.date_start + " 00:01" + Time.getUtcOffset(body.timezone ?? "Asia/Tehran"))).getTime();
    let end = (new Date(body.date_end + " 00:01" + Time.getUtcOffset(body.timezone ?? "Asia/Tehran"))).getTime();
    query = {
      "bool": {
        "must": [
          {
            "range": {
              "timestamp": {
                "gte": start,
                "lte": end
              }
            }
          }
        ], "should": []
      }
    };
  };
  return {
    "min_score": threshold + 1,
    "query": {
      "script_score": {
        query,
        "script": {
          "source": `
          double result = 0;
          if (doc['vector'] != null && doc['vector'].length > 0) {
            result = cosineSimilarity(params.query_vector, 'vector') + 1.0;
          } else {
            result = 0; // Example of setting a default score
          }
          return result;
        `,
          "params": {
            "query_vector": body["targetVector"] ?? []
          }
        }
      }
    },
  }
}
export default router;