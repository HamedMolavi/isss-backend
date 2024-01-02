import mongoose, { Schema } from "mongoose";
import Model from "./model";
import ModelToCamera from "./modelToCamera";
import Schedule from "./schedule";
import { CameraTypes } from "../../../types/enums/camera.enum";
import { ICamera } from "../../../types/interfaces/camera.interface";
import { balanceNewCamera } from "../../../tools/loadBalancer.tools";

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
  }
);


CameraSchema.post('save', balanceNewCamera);



CameraSchema.post(["remove", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"], async (doc) => {
  let deleted_model_to_cameras = await ModelToCamera.find({ camera_id: doc._id, }).exec();
  deleted_model_to_cameras.forEach(model_camera => Schedule.deleteMany({ model_camera_id: model_camera._id }).exec());
  let models = await Model.find({}).exec();
  models = models.filter((model) => deleted_model_to_cameras.some(m2c => m2c.model_id.toString() === model.id));
  models.forEach(model => process.load[model.category][model.name] -= 1);
  await ModelToCamera.deleteMany({
    camera_id: doc._id,
  }, { returnDocument: "before" }).exec();
});


// Compile model from schema
const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;
