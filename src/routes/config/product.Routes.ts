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
import { CreateProductBody, UpdateProductBody } from "../../validation/dto/product.dto";
import Product from "../../db/mongo/models/product";
import { IProduct } from "../../types/interfaces/product.interface";
import PersonImage from "../../db/mongo/models/personImage";
import { ImageFileSystem } from "../../tools/kafkaFile.tools";
import Personnel from "../../db/mongo/models/personnel";

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

router.get("",
  readMiddleware(Product, rawSearch, { populate: true, aggregate: true, forcePopulate: ["person_id"], send: productSendFunction }),

);
router.get("/:id",
  readByIdMiddleware(Product, { populate: true, forcePopulate: ["person_id"], send: productSendFunction })
);

// router.patch("/:id",
//   dtoValidationMiddleware(UpdatePersonnelBody, { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: "please fill all fields" }),
//   existCheck(Personnel, { $or: [{ national_code: "national_code" }, { personnel_code: "personnel_code" }] }, "Personnel already exists!"),
//   updateByIdMiddleware(Personnel, {
//     next: true, save: "doc", update: {
//       "time_start": {
//         name: "allowed_pass.start",
//         fn: (payload) => (new Date(payload.date_start + " " + payload.time_start + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime()
//       },
//       "time_end": {
//         name: "allowed_pass.end",
//         fn: (payload) => (new Date(payload.date_end + " " + payload.time_end + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime()
//       }
//     }
//   }),
//   fs.uploadAvatarMiddleware("avatar_str", "doc._id", { fileName: "avatar", resultPropertyName: "doc" }),
// );

router.delete("/:id",
  // DoNotAllowOnDefault(Product, { name: "default" }),
  deleteByIdMiddleware(Personnel, {
    idGenerator: async (bodyQueryPramas: any) => await Personnel.findById(await Product.findById(bodyQueryPramas.id).then(doc => doc?.person_id)).exec().then(doc => doc?.id)
  }), //also deletes image vector in post remove schema
  // deleteByIdMiddleware(Product), //also deletes image vector in post remove schema
);

async function productSendFunction(productDoc: IProduct & Required<{ _id: mongoose.Types.ObjectId; }>, req: Request) {
  try {
    if (isValidObjectId(productDoc.person_id)) productDoc.populate('person_id');
    const person: any = productDoc.person_id;
    const images = await PersonImage.find({ person_id: person._id }).exec();
    let pathRead = path.join(__dirname, `../../../assets/image/${person.id}/`);
    const files = images.map(image => person.id + "-" + image.hash_id + ".jpeg");
    const imageFilesRead = fs.readFiles(pathRead, files);
    return {
      ...productDoc.toJSON(),
      ...productDoc.features.reduce((ret: any, el) => { ret[el.name] = el.value; return ret }, {}),
      "person_images": imageFilesRead
    }
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

export default router;
