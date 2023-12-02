import mongoose, { Schema } from "mongoose";
import Model from "./model";
import ModelToCamera from "./modelToCamera";
import Schedule from "./schedule";
import { CameraTypes } from "../../../types/enums/camera.enum";
import { ICamera } from "../../../types/interfaces/camera.interface";

//create camera model with schema for save in DB
const CameraSchema: Schema<ICamera> = new Schema(
  {
    section_id: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    url: { type: String, required: true },
    nvr: { type: String, required: false },
    ip: { type: String, required: true },
    network: { type: String, default: "255.255.255.255" },
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    muted: [Schema.Types.ObjectId],
    is_enabled: { type: Boolean, required: true },
    damaged: { type: Boolean, required: false, default: false },
    create_date: { type: Date, default: Date.now },
    // camera_type: { type: String, required: true, enum: Object.values(CameraTypes) }
    camera_type: { type: String, required: true, enum: Object.values(CameraTypes) as string[], default: CameraTypes.enter }
  },
  {
    collection: "Camera",
  }
);


CameraSchema.post('save', async function (doc) {
  // update AI models related to the camera
  let models = await Model.find({}).exec();
  for (const model of models) {
    let _model2CameraSave = new ModelToCamera({
      _id: new mongoose.Types.ObjectId(),
      model_id: model._id,
      camera_id: doc._id,
      is_enabled: true,
    });
    await _model2CameraSave.save();
  };
});



CameraSchema.post(["remove", "deleteOne", "deleteMany","findOneAndDelete","findOneAndRemove"], async (doc) => {
  let deleted_model_to_cameras = await ModelToCamera.deleteMany({
    camera_id: doc._id,
  }, { returnDocument: "after" }).exec();
});


// Compile model from schema
const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;
