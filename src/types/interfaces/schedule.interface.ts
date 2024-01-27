import { Document, Schema } from "mongoose";

//define schedule type
export interface ISchedule extends Document {
  _id: Schema.Types.ObjectId;
  model_camera_id: Schema.Types.ObjectId;
  start_cron: string;
  stop_cron: string;
  config: IConfig;
  is_running: boolean;
}
//define config type
interface IConfig {
  timeDuplicationDiagnoses: number;
  threshold: number;
  min_people: number;
  max_people: number;
  zones: Array<[[number, number], [number, number], [number, number], [number, number]]>;
}

//define type of schedule for request body
export interface IGetParams {
  _id: Schema.Types.ObjectId;
  model_camera_id: Schema.Types.ObjectId;
  start: string;
  stop: string;
  dayOfWeek: number[];
  threshold: number;
  zones: Array<[[number, number], [number, number], [number, number], [number, number]]>;
  montionDetection: boolean;
  min_people: number;
  max_people: number;
  timeDuplicationDiagnoses: number;
}