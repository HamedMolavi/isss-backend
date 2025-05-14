import mongoose, { Document } from "mongoose";

//define jobTitle type
export interface IJobTitle extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  create_date: Date;
};