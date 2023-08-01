import mongoose, { Schema, Document } from "mongoose";
import Model from "./model";
import ModelToCamera from "./modelToCamera";
import Schedule from "./schedule";
import { ICamera } from "../interfaces/camera.interface";
import { CameraTypes } from "../interfaces/enums/camera.enum";
import { updateRooms } from "../tools/rooms.tools";

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
    camera_type: { type: String, required: true, enum: Object.values(CameraTypes) }
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
      is_enabled: false,
    });
    await _model2CameraSave.save();
  };
  // update ROOMS
  await updateRooms(doc);
});


CameraSchema.post("remove", async (doc) => {
  let model_to_camera = await ModelToCamera.find({
    camera_id: doc._id,
  }).exec();
  if (!!model_to_camera) {
    for (let model of model_to_camera) {
      let schedule = await Schedule.findOneAndDelete({
        model_camera_id: model._id,
      }).exec();
    };
    let model_to_camera_deleted = await ModelToCamera.deleteMany({
      camera_id: doc._id,
    }).exec();
  }
  await updateRooms(doc);
});


// Compile model from schema
const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;
