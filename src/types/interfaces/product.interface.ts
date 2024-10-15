import mongoose, { Document } from "mongoose";

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  images: Array<string>;
  product_code: string;
  person_id: mongoose.Types.ObjectId;
  face_log_id: string;
}