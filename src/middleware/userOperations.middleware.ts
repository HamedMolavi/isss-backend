import { NextFunction, Request, Response } from "express";
import User from "../db/mongo/models/user";
import mongoose from "mongoose";




export async function recordLastOperation(req: Request, res: Response, next: NextFunction) {
  const oldSend = res.send;
  const collections = (await mongoose.connection.db.listCollections().toArray()).map((col) => col.name);
  const pathComponents = req.baseUrl.split("/").map((el) => el.trim().toLowerCase());
  
  res.send = function (data) {
    // TODO: take from logger function
    User.updateOne({ _id: req.user._id }, {
      $set: {
        last_operation: {
          username: req.user.username,
          method: req.method,
          collection: collections.find((el) => pathComponents.includes(el.toLowerCase())),
          success: JSON.parse(data).success,
        }
      }
    }).exec();
    return oldSend.apply(this, [data]);
  };
  next();
}