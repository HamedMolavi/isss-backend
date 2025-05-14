import mongoose, { Document } from "mongoose";

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  create_date: Date;
  name: string;
  images: Array<string>;
  product_code: string;
  features: Array<{ name: string, value: any }>
  person_id: mongoose.Types.ObjectId;
  face_log_id: string;
}