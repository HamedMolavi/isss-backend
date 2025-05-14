import mongoose, { Schema } from "mongoose";

//define AccessLevel type
export const accessList = ["camera", "car", "color", "brand", "section", "department", "job", "personnel", "schedule", "user", "typeName", "systemLog", "system", "report"];
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
  system: number;
  report: number;
  product: number;
}

