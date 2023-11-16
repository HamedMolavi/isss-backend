import mongoose, { Schema } from "mongoose";
import { IModelToCamera } from "../../../types/interfaces/modelToCamera.interface";
import Schedule from "./schedule";

//create Model ModelToCamera with schema for save in DB
const ModelToCameraSchema: Schema<IModelToCamera> = new Schema(
  {
    model_id: { type: Schema.Types.ObjectId, ref: "Model" },
    camera_id: { type: Schema.Types.ObjectId, ref: "Camera" },
    is_enabled: { type: Boolean, default: false },
  },
  {
    collection: "Model_Camera",
  }
);

ModelToCameraSchema.post("remove", async (doc) => {
  let deleted_schedules = await Schedule.deleteMany({
      model_camera_id: doc._id,
  }, { returnDocument: "after" }).exec();
});

// Compile Model from schema
const ModelToCamera = mongoose.model("ModelToCamera", ModelToCameraSchema);

export default ModelToCamera;
