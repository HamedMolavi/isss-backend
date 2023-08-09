import mongoose, { Document } from "mongoose";

//define section type
export interface ISection extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  department_id: mongoose.Types.ObjectId;
  create_date: Date;
};

