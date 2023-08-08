import { Schema } from "mongoose";
import { IConfig } from "./config.interface";
export { };
declare global{
  //define schedule type
  interface ISchedule extends Document {
    _id: Schema.Types.ObjectId;
    model_camera_id: Schema.Types.ObjectId;
    start_cron: string;
    stop_cron: string;
    config: IConfig;
  };
};