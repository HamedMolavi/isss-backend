import { Document, Schema } from "mongoose";

//define schedule type
export interface ISchedule extends Document {
  _id: Schema.Types.ObjectId;
  model_camera_id: Schema.Types.ObjectId;
  start_cron: string;
  stop_cron: string;
  operations: [IOperation]; // based on zones
  is_running: boolean;
}
//define config type
export interface IOperation {
  timeDuplicationDiagnoses: number;
  threshold: number;
  min_people: number;
  max_people: number;
  zone: [number, number, number, number];
  logs: [ILogConfig]
}

export interface ILogConfig {
  log_type: Schema.Types.ObjectId
  log_name: Schema.Types.ObjectId
  log_level: string
}

//define type of schedule for request body
export interface IGetParams {
  _id: Schema.Types.ObjectId;
  model_camera_id: Schema.Types.ObjectId;
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
