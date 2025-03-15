import mongoose, { Schema } from "mongoose";
import { CameraTypes } from "../../../types/enums/camera.enum";
import { ICamera } from "../../../types/interfaces/camera.interface";

//create camera model with schema for save in DB
const CameraSchema: Schema<ICamera> = new Schema(
  {
    section_id: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    url: { type: String, required: true },
    nvr: { type: String, required: false },
    ip: { type: String, required: true },
    network: { type: String, default: "255.255.255.0" },
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    is_enabled: { type: Boolean, required: true },
    damaged: { type: Boolean, required: false, default: false },
    create_date: { type: Date, default: Date.now },
    camera_type: { type: String, required: true, enum: Object.values(CameraTypes) as string[], default: CameraTypes.enter }
  },
  {
    collection: "Camera",
    toJSON: {
      transform(_doc, ret) {
        delete ret["url"]
        delete ret["nvr"]
        delete ret["ip"]
        delete ret["network"]
        delete ret["username"]
        delete ret["password"];
        return ret;
      },
    }
  }
);



const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;
