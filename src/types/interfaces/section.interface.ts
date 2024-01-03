import mongoose, { Document } from "mongoose";

//define section type
export interface ISection extends Document {
  _id: mongoose.Types.ObjectId;
  is_enabled: boolean;
  name: string;
  department_id: mongoose.Types.ObjectId;
  create_date: Date;
};

