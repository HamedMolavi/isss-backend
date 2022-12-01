import mongoose, { Schema, Document } from "mongoose";

//define notification type
export interface INotification extends Document {
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
}

//create Notification model with schema for save in DB
const NotificationSchema: Schema<INotification> = new Schema(
  {
    create_date: { type: Date, default: Date.now },
    cameras: { type: [Schema.Types.ObjectId], ref: "Camera", required: false },
    types: { type: [Schema.Types.ObjectId],ref: "Model" ,required: false },
    time_start: { type: String, required: false , default:"00:00"},
    time_end: { type: String, required: false, default:"00:00" },
    bypass_time: { type: Boolean, required: false },
    has_video: { type: Boolean, required: false },
    enable: { type: Boolean, required: false },
    phone_number: { type: String, required: false , default:""},
    email: { type: String, required: false , default:""},
    sms_enable: { type: Boolean, required: false , default:false},
    email_enable: { type: Boolean, required: false , default:false},
  },
  {
    collection: "Notification",
  }
);

// Compile model from schema
const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
