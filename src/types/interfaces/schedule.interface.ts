import { Document, Schema } from "mongoose";

//define schedule type
export interface ISchedule extends Document {
  _id: Schema.Types.ObjectId;
  model_camera_id: Schema.Types.ObjectId;
  start_cron: string;
  stop_cron: string;
  config: IConfig;
}
//define config type
interface IConfig {
  timeDuplicationDiagnoses : number;
  threshold: number;
  min_people: number;
  max_people: number;
  zones: [[number, number, number, number]];
};

