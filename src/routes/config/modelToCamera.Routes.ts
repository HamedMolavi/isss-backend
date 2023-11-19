import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import ModelToCamera from "../../db/mongo/models/modelToCamera";
import Time from "../../tools/time.tools";
import { readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { injectDataMiddleware } from "../../tools/request.tools";

//create router for add to server file
const router: Router = Router();

//route for get modelsToCamera list
router.get(
  "",
  readMiddleware(ModelToCamera, undefined, { populate: true })
);

//add route for edit modelToCamera
router.patch(
  "",
  injectDataMiddleware(async (body: any) => await ModelToCamera.findOne({ $and: [{ model_id: body.model_id }, { camera_id: body.camera_id }] }), { injData: "id" }),
  updateByIdMiddleware(ModelToCamera, { ignore: ["camera_id", "model_id"] })
);

export default router;
