import mongoose, { Schema } from "mongoose";
export { };
//define camera type
declare global {
  //define car type
  interface ICar extends Document {
    _id: Schema.Types.ObjectId;
    owner: Schema.Types.ObjectId;
    number_plate: string;
    brand: Schema.Types.ObjectId;
    color: Schema.Types.ObjectId;
    camera_whitelist: Schema.Types.ObjectId[];
    tracked: boolean;
    create_date: Date;
  };
  //define car_brand type
  interface ICarBrand extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
  };
  //define car_color type
  interface ICarColor extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
  };
};