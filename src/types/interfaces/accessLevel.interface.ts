import mongoose, { Schema } from "mongoose";

//define AccessLevel type
export interface IAccessLevel extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  camera: number;
  car: number;
  color: number;
  brand: number;
  section: number;
  department: number;
  job: number;
  personnel: number;
  schedule: number;
  user: number;
  typeName: number;
  systemLog: number;
}
