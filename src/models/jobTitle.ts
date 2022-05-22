import mongoose, { Schema } from "mongoose";

//define jobTitle type
interface IJobTitle {
    name: string;
}


//create jobTitle model with schema for save in DB
const JobTitleSchema: Schema<IJobTitle> = new Schema({
    name: { type: String, required: true },
});

// Compile model from schema
const JobTitle = mongoose.model("JobTitle", JobTitleSchema);
export default JobTitle;