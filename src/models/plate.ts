import { NextFunction } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";

//define plate type
export interface IPlate {
    number: string,
    carBrand: string;
    color: string;
    owner: string;
    save: (next : NextFunction) => Promise<void>;
}


//create plate model with schema for save in DB
const PlateSchema: Schema<IPlate> = new Schema({
    number: { type: String, required: true },
    carBrand: { type: String, required: true },
    color: { type: String, required: true },
    owner: { type: String, required: true }
});

// Compile model from schema
const Plate = mongoose.model("Plate", PlateSchema);
export default Plate;