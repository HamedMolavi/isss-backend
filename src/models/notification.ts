import mongoose, { Schema, Document } from "mongoose";

//define notification type
export interface INotification extends Document {
  _id: Schema.Types.ObjectId;
  create_date: Date;
  cameras: Schema.Types.ObjectId[];
  departments: Schema.Types.ObjectId[];
  sections: Schema.Types.ObjectId[];
  types: Schema.Types.ObjectId[];
  time_start: string;
  time_end: string;
  bypass_time: boolean;
  has_video: boolean;
  enable: boolean;
  phone_numbers: string[];
  emails: string[];
  sms_enable: boolean;
  email_enable: boolean;
}

//create Notification model with schema for save in DB
const NotificationSchema: Schema<INotification> = new Schema(
  {
    create_date: { type: Date, default: Date.now },
    cameras: { type: [Schema.Types.ObjectId], ref: "Camera", required: false },
    departments: { type: [Schema.Types.ObjectId], ref: "Department", required: false },
    sections: { type: [Schema.Types.ObjectId], ref: "Section", required: false },
    types: { type: [Schema.Types.ObjectId],ref: "Model" ,required: false },
    time_start: { type: String, required: false },
    time_end: { type: String, required: false },
    bypass_time: { type: Boolean, required: false },
    has_video: { type: Boolean, required: false },
    enable: { type: Boolean, required: false },
    phone_numbers: { type: [String], required: false },
    emails: { type: [String], required: false },
    sms_enable: { type: Boolean, required: false },
    email_enable: { type: Boolean, required: false },
  },
  {
    collection: "Notification",
  }
);

// Compile model from schema
const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
