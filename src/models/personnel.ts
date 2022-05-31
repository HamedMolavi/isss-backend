import { NextFunction } from "express";
import mongoose, { Schema, Document } from "mongoose";

//define personnel type
export interface IPersonnel extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    family: string;
    phone: string;
    jobTitle: string;
    create_date: Date;
}

//create personnel model with schema for save in DB
const PersonnelSchema: Schema<IPersonnel> = new Schema({
    name: { type: String, required: true },
    family: { type: String, required: true },
    phone: { type: String, required: true },
    jobTitle: { type: Schema.Types.ObjectId, ref: 'JobTitle' },
    create_date: { type: Date, default: Date.now }
});

// Compile model from schema
const Personnel = mongoose.model("Personnel", PersonnelSchema);
export default Personnel;