import mongoose, { Schema , Document } from "mongoose";

//define color type
export interface IColor extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
}


//create color model with schema for save in DB
const ColorSchema: Schema<IColor> = new Schema({
    name: { type: String, required: true },
});

// Compile model from schema
const Color = mongoose.model("Color", ColorSchema);
export default Color;
