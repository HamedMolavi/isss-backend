import mongoose, { Schema } from "mongoose";

//define car type
export interface ICar extends Document {
  _id: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  number_plate: string;
  brand: Schema.Types.ObjectId;
  color: Schema.Types.ObjectId;
  camera_whitelist: mongoose.Types.ObjectId[];
  section_whitelist: Schema.Types.ObjectId[];
  department_whitelist: Schema.Types.ObjectId[];
  schedule_whitelist: Schema.Types.ObjectId[];
  tracked: boolean;
  allowed_pass: {"start": number, "end": number} | undefined;
  create_date: Date;
}
//define car_brand type
export interface ICarBrand extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  system: boolean;
}
//define car_color type
export interface ICarColor extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  fa_name: string
}