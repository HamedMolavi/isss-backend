import { Schema } from "mongoose";
export { };
declare global{
  //define notification type
  interface INotification extends Document {
    _id: Schema.Types.ObjectId;
    create_date: Date;
    cameras: Schema.Types.ObjectId[];
    types: Schema.Types.ObjectId[];
    time_start: string;
    time_end: string;
    bypass_time: boolean;
    has_video: boolean;
    enable: boolean;
    phone_number: string;
    email: string;
    sms_enable: boolean;
    email_enable: boolean;
  };
};