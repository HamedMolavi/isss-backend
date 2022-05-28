import { NextFunction } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";

//define camera type
export interface ICamera {
    _id: mongoose.Types.ObjectId;
    name: string,
    section_id: mongoose.Types.ObjectId,
    url: string,
    ip: string,
    username: string;
    password: string;
    is_enabled: boolean;
    save: (next: NextFunction) => Promise<void>;
}


//create camera model with schema for save in DB
const CameraSchema: Schema<ICamera> = new Schema({
    name: { type: String, required: true },
    section_id: { type: Schema.Types.ObjectId, ref: 'Section' },
    url: { type: String, required: true },
    ip: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    is_enabled: { type: Boolean, required: true },
});

// Compile model from schema
const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;