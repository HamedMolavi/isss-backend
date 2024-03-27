import { Router } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { ReadSimilarVectorsBody } from "../../validation/dto/similarity.dto";
import { cosineSimilarity } from "../../tools/utils.tools";
import { readElasticMiddlewareHamed } from "../../db/elastic/read.logs";


//create router for add to routes file
const router: Router = Router();

router.post('',
  dtoValidationMiddleware(ReadSimilarVectorsBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  readElasticMiddlewareHamed(`${process.env["FACE_INDEX"] ?? "face_log"}`, { next: true }),
  (req, res, next) => {
    const threshold = (req.body["threshold"] ?? 50) / 100;
    let data = req.body?.["esRes"].map((el: undefined | { vector?: number[] }) => {
      Object.prototype.hasOwnProperty.call(el, "vector")
      if (!!el && Array.isArray(el["vector"]) && el["vector"].length === 512 && el["vector"].every((num) => typeof (num) === "number")) {
        return {
          "similarity": cosineSimilarity(req.body["vector"], el["vector"]),
          ...el
        };
      }
      return undefined;
    }).filter((el: any) => !!el && el["similarity"] >= threshold);
    return res.status(200).json({
      success: true,
      data,
      // page,
      // perPage,
      total: data.length,
      // pages: Math.ceil((data.length) / perPage),
    });
  }
)


router.get('/:id',
  readElasticMiddlewareHamed(`${process.env["FACE_INDEX"] ?? "face_log"}`, { next: true }),
  (req, res, next) => {
    const threshold = (req.body["threshold"] ?? 50) / 100;
    let data = req.body?.["esRes"].map((el: undefined | { vector?: number[] }) => {
      Object.prototype.hasOwnProperty.call(el, "vector")
      if (!!el && Array.isArray(el["vector"]) && el["vector"].length === 512 && el["vector"].every((num) => typeof (num) === "number")) {
        return {
          "similarity": cosineSimilarity(req.body["vector"], el["vector"]),
          ...el
        };
      }
      return undefined;
    }).filter((el: any) => !!el && el["similarity"] >= threshold);
    return res.status(200).json({
      success: true,
      data,
      // page,
      // perPage,
      total: data.length,
      // pages: Math.ceil((data.length) / perPage),
    });
  }
)

export default router;