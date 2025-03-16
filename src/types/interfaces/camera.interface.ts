import mongoose, { Schema } from "mongoose";
import { CameraTypes } from "../enums/camera.enum";

//define camera type
export interface ICamera extends Document {
  _id: mongoose.Types.ObjectId;
  serial: string,
  name: string,
  type: string,
  index: number,
  url: string,
  plate_base: boolean,
  target_fps: number,
  zones: Array<[[number, number], [number, number], [number, number], [number, number]]>
}

export interface ICameraInfo {
  [key: string]: string | undefined;
  ip?: string | undefined;
  username?: string | undefined;
  password?: string | undefined;
  nvr?: string | undefined;
};

export const CameraInfoKeys: ICameraInfo = {
  ip: "true",
  username: "true",
  password: "true",
  nvr: "true"
};