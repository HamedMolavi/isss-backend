import mongoose, { Schema } from "mongoose";
import { CameraTypes } from "./enums/camera.enum";

//define camera type
export interface ICamera extends Document {
  _id: mongoose.Types.ObjectId;
  section_id: mongoose.Types.ObjectId;
  network: string;
  url: string;
  nvr: string;
  ip: string;
  name: string;
  username: string;
  password: string;
  muted: Schema.Types.ObjectId[];
  is_enabled: boolean;
  create_date: Date;
  camera_type: string;
}

export interface ICameraInfo {
  [key: string]: string
  ip: string;
  username: string;
  password: string;
  nvr: string;
};

export const CameraInfoKeys: ICameraInfo = {
  ip: "true",
  username: "true",
  password: "true",
  nvr: "true"
};