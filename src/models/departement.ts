import { NextFunction } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";

//define departement type
export interface IDepartement {
    _id: mongoose.Types.ObjectId;
    name: string;
    created_date: Date;
    save: (next: NextFunction) => Promise<void>;
}


//create departement model with schema for save in DB
const DepartementSchema: Schema<IDepartement> = new Schema({
    name: { type: String, required: true },
    created_date: { type: Date, default: Date.now }
});

// Compile model from schema
const Departement = mongoose.model("Departement", DepartementSchema);
export default Departement;
