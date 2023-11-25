import mongoose, { Schema } from "mongoose";
import { IModel } from "../../../types/interfaces/model.interface";
import ModelToCamera from "./modelToCamera";

//create Model  with schema for save in DB
const ModelSchema: Schema<IModel> = new Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    uri: { type: String, required: true }
}, {
    collection: "Model"
});

ModelSchema.post(["remove", "deleteOne", "deleteMany","findOneAndDelete","findOneAndRemove"], async (doc) => {
    let deleted_model_to_cameras = await ModelToCamera.deleteMany({
        model_id: doc._id,
    }, { returnDocument: "after" }).exec();
});


// Compile Model from schema
const Model = mongoose.model("Model", ModelSchema);
export default Model;