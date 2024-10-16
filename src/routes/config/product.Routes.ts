import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import { dtoValidationMiddleware } from "../../validation/dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import mongoose, { Document } from "mongoose";
import { DoNotAllowOnDefault, injectDataMiddleware } from "../../tools/request.tools";
import { CreateProductBody, UpdateProductBody } from "../../validation/dto/product.dto";
import Product from "../../db/mongo/models/product";
import { IProduct } from "../../types/interfaces/product.interface";

const router: Router = Router();
const rawSearch = (search: string) => {
  if (search.includes(":")) {
    let res: { [key: string]: any } = {}
    const splitted = search.split(':');
    for (let i = 0; i < splitted.length; i += 2) {
      const key = splitted[i];
      let value: any = splitted[i + 1];
      if (!value) continue
      else if (value?.toLowerCase() === 'true') value = true;
      else if (value?.toLowerCase() === 'false') value = false;
      res[key] = value;
    }
    return res;
    // const key = search.split(':').at(0);
    // let value: any = search.split(':').at(1);
    // if (value?.toLowerCase() === 'true') value = true;
    // if (value?.toLowerCase() === 'false') value = false;
    // if (!!key) return { [key]: value }
  }
  return {
    $or: [
      { first_name: { $regex: search } },
      { last_name: { $regex: search } },
      { national_code: { $regex: search } },
      { personnel_code: { $regex: search } },
      { phone_number: { $regex: search } }]
  }
};


router.post("",
  dtoValidationMiddleware(CreateProductBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Product, { $and: [{ product_code: "product_code" }] }, "Product already exists!"),
  createMiddleware([
    { name: (body) => body['product_name'] ?? 'product' },
    { images: (body) => body['product_images'] },
    // { product_code: (body) => body['person']['personnel_code'] },
    "product_code",
    // { person_id: (body) => body['person']['_id'] },
    "person_id",
    "face_log_id",
    { features: (body) => [{ name: "product_weight", value: body['product_weight'] }] }
  ], Product, {
    send: (doc: IProduct & Required<{ _id: mongoose.Types.ObjectId; }>) => Object.assign(doc.toJSON(), doc.features.reduce((ret: any, el) => { ret[el.name] = el.value; return ret }, {}))
  }),
);
/*
//route for get personnels list
router.get(["", "/search", "/hostile", "/guest"],
  readMiddleware(Personnel, rawSearch, { next: false, send: personnelSendFunction, populate: true })
);

//route for get personnel by id from DB
router.get("/:id",
  readByIdMiddleware(Personnel, { populate: true })
);

//add route for edit personnel
router.patch("/:id",
  dtoValidationMiddleware(UpdatePersonnelBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  existCheck(Personnel, { $or: [{ national_code: "national_code" }, { personnel_code: "personnel_code" }] }, "Personnel already exists!"),
  updateByIdMiddleware(Personnel, {
    next: true, save: "doc", update: {
      "time_start": {
        name: "allowed_pass.start",
        fn: (payload) => (new Date(payload.date_start + " " + payload.time_start + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime()
      },
      "time_end": {
        name: "allowed_pass.end",
        fn: (payload) => (new Date(payload.date_end + " " + payload.time_end + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime()
      }
    }
  }),
  fs.uploadAvatarMiddleware("avatar_str", "doc._id", { fileName: "avatar", resultPropertyName: "doc" }),
);



const specialTypes = ["Hostile", "Guest"]
async function personnelSendFunction(_personnel: any, req: Request) {
  let per = _personnel.toJSON();
  // TODO: fetch last location from normalizer server.
  if (!!req?.query?.lastSeen) {
    let logPersonnel = await requestForGetPersonnel(_personnel._id.toString());
    let _camera;
    if (logPersonnel?.data?.hits?.hits?.length > 0) {
      try {
        _camera = await Camera.findById(logPersonnel.data.hits.hits[0]?._source?.camera_id).populate("section_id").exec();
      } catch (error: any) {
        if (error.name.toString() === 'CastError') console.log(`!!! Elastic data error: ${logPersonnel.data.hits.hits[0]?._source?.camera_id} as camera._id is wrong`);
      }
      per.lastTimeSeen = new Date(logPersonnel.data?.hits?.hits[0]?._source?.timestamp);
    }
    (per.lastCameraSeen = _camera ? _camera.name : ""), (per.lastSection = _camera ? _camera.section_id : "");
  }
  if (!!per.allowed_pass) per.allowed_pass = allowedPassRevert(per);
  const type = specialTypes.find(t => req.originalUrl.toLowerCase().includes(t.toLowerCase()));

  return (!!type ? per?.first_name === type : !specialTypes.includes(per?.first_name)) ? per : undefined;
};
*/
router.delete("/:id",
  // DoNotAllowOnDefault(Product, { name: "default" }),
  deleteByIdMiddleware(Product), //also deletes image vector in post remove schema
);
export default router;
