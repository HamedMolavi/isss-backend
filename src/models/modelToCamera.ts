import mongoose, { Schema, Document } from "mongoose";

//define ModelToCamera type
export interface IModelToCamera extends Document {
    _id: Schema.Types.ObjectId;
    model_id: Schema.Types.ObjectId;
    camera_id: Schema.Types.ObjectId;
}

//create Model ModelToCamera with schema for save in DB
const ModelToCameraSchema: Schema<IModelToCamera> = new Schema({
    model_id: { type: Schema.Types.ObjectId, ref: "Model" },
    camera_id: { type: Schema.Types.ObjectId, ref: "Camera" }
},{
    collection: "Model_Camera"
});

// Compile Model from schema
const Model = mongoose.model("ModelToCamera", ModelToCameraSchema);

export default Model;