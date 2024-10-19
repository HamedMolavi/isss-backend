import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import { dtoValidationMiddleware } from "../../validation/dto";
import { existCheck } from "../../validation/db";
import { createMiddleware } from "../../db/mongo/create.database";
import { readByIdMiddleware, readMiddleware } from "../../db/mongo/read.database";
import { updateByIdMiddleware } from "../../db/mongo/update.database";
import { deleteByIdMiddleware } from "../../db/mongo/delete.database";
import mongoose, { Document, FilterQuery, isValidObjectId, PipelineStage } from "mongoose";
import { DoNotAllowOnDefault, injectDataMiddleware } from "../../tools/request.tools";
import { CreateProductBody, FilterProductBody, UpdateProductBody } from "../../validation/dto/product.dto";
import Product from "../../db/mongo/models/product";
import { IProduct } from "../../types/interfaces/product.interface";
import PersonImage from "../../db/mongo/models/personImage";
import { ImageFileSystem } from "../../tools/kafkaFile.tools";
import Personnel from "../../db/mongo/models/personnel";
import { productCols, sendExcelMiddleware } from "../../tools/excel.tools";

//create customized filesystem
const fs = new ImageFileSystem();

const router: Router = Router();
const rawSearch = (search: string) => {
  // if (search.includes(":")) {
  //   let res: { [key: string]: any } = {}
  //   const splitted = search.split(':');
  //   for (let i = 0; i < splitted.length; i += 2) {
  //     const key = splitted[i];
  //     let value: any = splitted[i + 1];
  //     if (!value) continue
  //     else if (value?.toLowerCase() === 'true') value = true;
  //     else if (value?.toLowerCase() === 'false') value = false;
  //     res[key] = value;
  //   }
  //   return res;
  // }
  const query: PipelineStage[] = [
    { $lookup: { from: "Personnel", localField: "person_id", foreignField: "_id", as: "person" } },
    { $unwind: "$person" },
    {
      $match: {
        $or: [
          { "person.first_name": { $regex: search } },
          { "person.last_name": { $regex: search } },
          { "person.national_code": { $regex: search } },
          { "person.personnel_code": { $regex: search } },
          { "person.phone_number": { $regex: search } },
          { "name": { $regex: search } },
          { "product_code": { $regex: search } },
        ]
      }
    },
    // { $addFields: { first_name: "$person.first_name", last_name: "$person.last_name", personnel_code: "$person.personnel_code" } },
    // { $unset: ["person"] }
    { $replaceWith: `$$ROOT` }

  ];
  return query
};

const filterSearch = (bodyStr: string) => {
  const body = JSON.parse(bodyStr);
  const query: PipelineStage[] = [
    { $lookup: { from: "Personnel", localField: "person_id", foreignField: "_id", as: "person" } },
    { $unwind: "$person" },
    {
      $match: {
        $and: [
          body['name'] && { "name": { $regex: body['name'] } },
          body['personnels']?.filter((el: any) => !!el)?.length && { $or: body['personnels']?.filter((el: any) => !!el).map((person_id: string) => ({ "person_id": new mongoose.Types.ObjectId(person_id) })) },
          body['client_type'] && { "person.person_type": body['client_type'] },
          body['time_start'] && { create_date: { $gt: new Date(body["date_start"] + " " + body["time_start"]) } },
          body['time_end'] && { create_date: { $lt: new Date(body["date_end"] + " " + body["time_end"]) } },
        ].filter(el => !!el)
      }
    },
    { $replaceWith: `$$ROOT` }
  ];
  return query
};

//////    CREATE
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

//////    READ

router.get("",
  readMiddleware(Product, rawSearch, { populate: true, aggregate: true, forcePopulate: ["person_id"], send: productSendFunction }),
);

router.get("/excel",
  readMiddleware(Product, rawSearch, { populate: true, aggregate: true, forcePopulate: ["person_id"], next: true, save: "products", send: productExcelSendFunction }),
);

router.post("/filter$",
  dtoValidationMiddleware(FilterProductBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  readMiddleware(Product, filterSearch, {
    populate: true, forcePopulate: ["person_id"], aggregate: true,
    send: productSendFunction,
    searchFromBody: (body) => Object.values(body).some((v: any) => ["string", "boolean", "number"].includes(typeof v) ? !!v : !!v?.filter((el: any) => !!el)?.length) ? JSON.stringify(body) : ""
  }),
);

router.post("/filter/excel",
  dtoValidationMiddleware(FilterProductBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
  readMiddleware(Product, filterSearch, {
    populate: true, forcePopulate: ["person_id"], aggregate: true, save: "products", next: true,
    send: productExcelSendFunction,
    searchFromBody: (body) => Object.values(body).some((v: any) => ["string", "boolean", "number"].includes(typeof v) ? !!v : !!v?.filter((el: any) => !!el)?.length) ? JSON.stringify(body) : ""
  }),
);

router.use("*/excel$",
  sendExcelMiddleware({ cols: productCols, rows: "products" })
)

router.get("/:id",
  readByIdMiddleware(Product, { populate: true, forcePopulate: ["person_id"], send: productSendFunction })
);

//////    UPDATE
/*
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
*/

//////    DELETE
router.delete("/:id",
  // DoNotAllowOnDefault(Product, { name: "default" }),
  deleteByIdMiddleware(Personnel, {
    idGenerator: async (bodyQueryPramas: any) => await Personnel.findById(await Product.findById(bodyQueryPramas.id).then(doc => doc?.person_id)).exec().then(doc => doc?.id)
  }), //also deletes image vector in post remove schema
  // deleteByIdMiddleware(Product), //also deletes image vector in post remove schema
);

async function productSendFunction(productDoc: IProduct & Required<{ _id: mongoose.Types.ObjectId; }>, req: Request) {
  try {
    if (isValidObjectId(productDoc.person_id)) await productDoc.populate('person_id');
    const person: any = productDoc.person_id;
    const images = await PersonImage.find({ person_id: person._id }).exec();
    let pathRead = path.join(__dirname, `../../../assets/image/${person.id}/`);
    const files = images.map(image => person.id + "-" + image.hash_id + ".jpeg");
    const imageFilesRead = fs.readFiles(pathRead, files);
    return {
      ...productDoc.toJSON(),
      ...productDoc.features.reduce((ret: any, el) => { ret[el.name] = el.value; return ret }, {}),
      "person_images": imageFilesRead,
      "client_type": person.person_type
    }
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

async function productExcelSendFunction(productDoc: IProduct & Required<{ _id: mongoose.Types.ObjectId; }>, req: Request) {
  if (isValidObjectId(productDoc.person_id)) await productDoc.populate('person_id');
  const person: any = productDoc.person_id;
  const images = await PersonImage.find({ person_id: person._id }).exec();
  let pathRead = path.join(__dirname, `../../../assets/image/${person.id}/`);
  const files = images.map(image => person.id + "-" + image.hash_id + ".jpeg");
  const imageFilesRead = fs.readFiles(pathRead, files);
  return {
    first_name: person.first_name,
    last_name: person.last_name,
    person_image: imageFilesRead?.[0],
    name: productDoc.name,
    person_type: person.person_type,
    image: productDoc.images[0],
    create_time: productDoc.create_date,
    create_date: productDoc.create_date,
    product_weight: productDoc.features.find(el => el.name === "product_weight")?.value
  }
}
export default router;
