import mongoose, { Schema, Document } from "mongoose";

//define person_image type
export interface IPersonImage extends Document {
    _id: mongoose.Types.ObjectId;
    person_id: string;
    guid: string;
    vector: number[];
}

//create Model person_image with schema for save in DB
const PersonImageSchema: Schema<IPersonImage> = new Schema({
    person_id: { type: Schema.Types.ObjectId, ref: "Personnel" },
    guid: { type: String, required: true },
    vector: { type: [Number], required: true }
});

// Compile Model from schema
const Model = mongoose.model("Person_Image", PersonImageSchema);
export default Model;