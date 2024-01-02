import mongoose, { Schema } from "mongoose";

//define AccessLevel type
export interface IAccessLevel extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  camera: number;
}
