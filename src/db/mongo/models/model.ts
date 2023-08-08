import mongoose, { Schema, Document } from "mongoose";

//create Model  with schema for save in DB
const ModelSchema: Schema<IModel> = new Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    uri: { type: String, required: true }
},{
    collection: "Model"
});

// Compile Model from schema
const Model = mongoose.model("Model", ModelSchema);
export default Model;