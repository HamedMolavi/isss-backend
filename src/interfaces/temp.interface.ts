import mongoose from "mongoose";

//define type of schedule for request body
export interface IGetParams {
  _id: mongoose.Types.ObjectId;
  model_camera_id: mongoose.Types.ObjectId;
  start: string;
  stop: string;
  dayOfWeek: number[];
  threshold: number;
  zones: [[number, number, number, number]];
  montionDetection: boolean;
  min_people: number;
  max_people: number;
  timeDuplicationDiagnoses: number;
}


export interface IChildrenCamera {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  url: string;
  username: string;
  password: string;
  ip: string;
  is_enabled: boolean;
}

export interface IChildrenSection {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  children: IChildrenCamera[];
}

export interface IResponseJson {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  children: IChildrenSection[];
}