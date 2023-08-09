import mongoose, { Schema } from "mongoose";

//define car type
export interface ICar extends Document {
  _id: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  number_plate: string;
  brand: Schema.Types.ObjectId;
  color: Schema.Types.ObjectId;
  camera_whitelist: Schema.Types.ObjectId[];
  tracked:boolean;
  create_date: Date;
}
//define car_brand type
export interface ICarBrand extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
}
//define car_color type
export interface ICarColor extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
}