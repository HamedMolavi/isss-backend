import { NextFunction } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";

//define section type
export interface ISection {
    _id: mongoose.Types.ObjectId;
    name: string;
    departement_id: mongoose.Types.ObjectId;
    save: (next: NextFunction) => Promise<void>;
}


//create section model with schema for save in DB
const SectionSchema: Schema<ISection> = new Schema({
    name: { type: String, required: true },
    //add realational ducoment to departement
    departement_id: { type: Schema.Types.ObjectId, ref: "Departement" }
});

// Compile model from schema
const Section = mongoose.model("Section", SectionSchema);
export default Section;