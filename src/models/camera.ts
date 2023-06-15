import mongoose, { Schema, Document } from "mongoose";
import { CameraTypes } from "../tools/enums/camera";

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
  muted : Schema.Types.ObjectId[];
  is_enabled: boolean;
  create_date: Date;
  camera_type:CameraTypes;

}

//create camera model with schema for save in DB
const CameraSchema: Schema<ICamera> = new Schema(
  {
    section_id: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    url: { type: String, required: true },
    nvr: { type: String, required: false },
    ip: { type: String, required: true },
    network: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    muted: [Schema.Types.ObjectId],
    is_enabled: { type: Boolean, required: true },
    create_date: { type: Date, default: Date.now },
    camera_type: { type: String, required: true }
  },
  {
    collection: "Camera",
  }
);

// Compile model from schema
const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;
