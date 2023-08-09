import mongoose, { Schema , Document } from "mongoose";

//define jobTitle type
export interface IJobTitle extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    create_date: Date;
}


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