import { Request, Router } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { ReadSimilarVectorsBody } from "../../validation/dto/similarity.dto";
import { cosineSimilarity } from "../../tools/utils.tools";
import { readByIdElasticMiddleware, readElasticMiddlewareHamed } from "../../db/elastic/read.logs";
import { ApiError } from "../../types/classes/error.class";


//create router for add to routes file
const router: Router = Router();

router.post('',
  dtoValidationMiddleware(ReadSimilarVectorsBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  readElasticMiddlewareHamed(`${process.env["FACE_INDEX"] ?? "face_log"}`, { send: filterSendFunction }),
)


router.get('/:id',
  readByIdElasticMiddleware(`${process.env["FACE_INDEX"] ?? "face_log"}`, {
    next: true, save: "targetVector", send: (log: any, req) => {
      let targetVector = log?.["vector"];
      if (!Array.isArray(targetVector) || targetVector.length !== 512 || !targetVector.every((num) => typeof (num) === "number")) throw Error("Target face log has disordered vector!");
      return log?.["vector"];
    }
  }),
  readElasticMiddlewareHamed(`${process.env["FACE_INDEX"] ?? "face_log"}`, { send: filterSendFunction }),
)

function filterSendFunction(log: any, req: Request) {
  const threshold = Number(req.query["threshold"] ?? 50) / 100;
  let targetVector = req.body["targetVector"] ?? req.body["vector"];
  if (!!log && Array.isArray(log["vector"]) && log["vector"].length === 512 && log["vector"].every((num) => typeof (num) === "number")) {
    const similarity = cosineSimilarity(targetVector, log["vector"]);
    if (similarity >= threshold) return { similarity, ...log };
  }
  return undefined;
}
export default router;