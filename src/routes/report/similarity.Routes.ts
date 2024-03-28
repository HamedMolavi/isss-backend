import { Request, Router } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { ReadSimilarVectorsBody } from "../../validation/dto/similarity.dto";
import { cosineSimilarity } from "../../tools/utils.tools";
import { readByIdElasticMiddleware, readElasticMiddlewareHamed } from "../../db/elastic/read.logs";
import { ApiError } from "../../types/classes/error.class";
import { injectDataMiddleware } from "../../tools/request.tools";
import { readMiddleware } from "../../db/mongo/read.database";
import Camera from "../../db/mongo/models/camera";
import Personnel from "../../db/mongo/models/personnel";
import { dataCollector, injectAllKindOfStuff, sendDataMiddleware, unifiedSendFunction } from "../../tools/middleware.tools";
import { daySendFunction } from "../../tools/track.tools";


//create router for add to routes file
const router: Router = Router();

router.post('/:type(tree|table)',
  dtoValidationMiddleware(ReadSimilarVectorsBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
)
router.use('/table/:id?',
  readMiddleware(Camera, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "camera" }),
  readMiddleware(Personnel, () => { return {} }, { forceAll: true, populate: true, forcePopulate: ["section_id", "department_id"], next: true, save: "personnel" }),
  injectDataMiddleware(injectAllKindOfStuff(['camera', 'personnel']), { spread: true }),
)
router.get('/:type(tree|table)/:id',
  readByIdElasticMiddleware(`${process.env["FACE_INDEX"] ?? "face_log"}`, {
    next: true, save: "targetVector", send: (log: any, req) => {
      let targetVector = log?.["vector"];
      if (!Array.isArray(targetVector) || targetVector.length !== 512 || !targetVector.every((num) => typeof (num) === "number")) throw Error("Target face log has disordered vector!");
      return log?.["vector"];
    }
  }),
)
router.use('/:type(tree|table)/:id?',
  readElasticMiddlewareHamed(`${process.env["FACE_INDEX"] ?? "face_log"}`, { next: true, save: "similars", send: filterAndReformatSendFunction }),
)
router.use('/tree/:id?',
  injectDataMiddleware((body: any) => dataCollector(body["similars"] ?? []), { injData: "collectedData" }),
  readMiddleware(Camera, undefined, { next: true, forceAll: true, save: "cameras" }),
  sendDataMiddleware((body: any) => body["collectedData"]?.map((track: any) => daySendFunction(track, { body, "query": { "timezone": body.timezone as string | undefined } } as unknown as Request)))
)
router.use('/table/:id?',
  sendDataMiddleware((body: any) => body["similars"]?.map((log: any) => unifiedSendFunction(log, { body, "query": { "timezone": body.timezone as string | undefined } } as unknown  as Request)))
)



function filterAndReformatSendFunction(log: any, req: Request) {
  const threshold = Number(req.query["threshold"] ?? req.body["threshold"] ?? 50) / 100;
  let targetVector = req.body["targetVector"] ?? req.body["vector"];
  if (!!log && Array.isArray(log["vector"]) && log["vector"].length === 512 && log["vector"].every((num) => typeof (num) === "number")) {
    const similarity = cosineSimilarity(targetVector, log["vector"]);
    if (similarity >= threshold) return { similarity, ...log };
  }
  return undefined;
}
export default router;