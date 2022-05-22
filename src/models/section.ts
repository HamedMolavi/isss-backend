import { NextFunction } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";

//define section type
export interface ISection {
    name: string;
    departement: string;
    save: (next : NextFunction) => Promise<void>;
}


//create section model with schema for save in DB
const SectionSchema: Schema<ISection> = new Schema({
    name: { type: String, required: true },
    //add realational ducoment to departement
    departement: { type: Schema.Types.ObjectId, ref: 'Departement' },
});

// Compile model from schema
const Section = mongoose.model("Section", SectionSchema);
export default Section;