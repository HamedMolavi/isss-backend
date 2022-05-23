import { NextFunction } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";

//define camera type
export interface ICamera {
    _id: mongoose.Types.ObjectId;
    ip: string,
    name: string,
    username: string;
    password: string;
    rstpLink: string;
    save: (next : NextFunction) => Promise<void>;
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