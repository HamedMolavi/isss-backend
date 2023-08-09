import mongoose, { Schema  } from "mongoose";
import { IJobTitle } from "../../../types/interfaces/jobTitle.interface";

//create jobTitle model with schema for save in DB
const JobTitleSchema: Schema<IJobTitle> = new Schema({
    name: { type: String, required: true },
    create_date: { type: Date, default: Date.now }
},{
    collection: "Job"
});

// Compile model from schema
const JobTitle = mongoose.model("JobTitle", JobTitleSchema);
export default JobTitle;