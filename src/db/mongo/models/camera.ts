import mongoose, { Schema } from "mongoose";
import { CameraTypes } from "../../../types/enums/camera.enum";
import { ICamera } from "../../../types/interfaces/camera.interface";

//create camera model with schema for save in DB
const CameraSchema: Schema<ICamera> = new Schema(
  {
    name: { type: String, required: true },
    serial: { type: String, required: true },
    type: { type: String, required: true },
    index: { type: Number, required: true },
    url: { type: String, required: true },
    plate_base: { type: Boolean, required: true },
    target_fps: { type: Number, required: true },
    zones: Array<{ type: [[Number, Number], [Number, Number], [Number, Number], [Number, Number]], required: true }>,

  },
  {
    collection: "Camera",
    toJSON: {
      transform(_doc, ret) {
        return ret;
      },
    }
  }
);



const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;
