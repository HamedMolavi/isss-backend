import { NextFunction } from "express";
import mongoose, { Schema } from "mongoose";

//define AI type
export interface IAI {
    _id: mongoose.Types.ObjectId;
    start: string;
    end: string;
    thresholdid: number;
    minTime: string;
    zone: String[];
    type: string;
    minPeople: number;
    maxPeople: number;
    create_date : Date;
    save: (next : NextFunction) => Promise<void>;
}

//create AI model with schema for save in DB
const AISchema: Schema<IAI> = new Schema({
    start: { type: String, required: true },
    end: { type: String, required: true },
    thresholdid: { type: Number, required: false },
    minTime: { type: String, required: false },
    zone: { type: [String], required: true },
    type: { type: String, required: true },
    minPeople: { type: Number, required: false },
    maxPeople: { type: Number, required: false },
    create_date: { type: Date, default: Date.now }
});

// Compile model from schema
const AI = mongoose.model("AI", AISchema);
export default AI;