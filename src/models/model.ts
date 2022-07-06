import mongoose, { Schema, Document } from "mongoose";

//define Model type
export interface IModel extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    category: string;
    uri: string;
}

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