import { NextFunction } from "express";
import mongoose, { Schema } from "mongoose";

//define jobTitle type
export interface IJobTitle {
    _id: mongoose.Types.ObjectId;
    name: string;
    create_date: Date;
    save: (next: NextFunction) => Promise<void>;
}


//create jobTitle model with schema for save in DB
const JobTitleSchema: Schema<IJobTitle> = new Schema({
    name: { type: String, required: true },
    create_date: { type: Date, default: Date.now }
});

// Compile model from schema
const JobTitle = mongoose.model("JobTitle", JobTitleSchema);
export default JobTitle;