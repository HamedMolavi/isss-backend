import mongoose, { Schema, Document, Model } from "mongoose";

//define camera type
export interface ICamera {
    ip: string,
    name: string,
    username: string;
    password: string;
    rstpLink: string;
}


//create camera model with schema for save in DB
const CameraSchema: Schema<ICamera> = new Schema({
    ip: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    rstpLink: { type: String, required: true },
});

// Compile model from schema
const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;