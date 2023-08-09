import mongoose from "mongoose";

//define department type
export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  created_date: Date;
}