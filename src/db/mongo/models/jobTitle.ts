import mongoose, { Schema } from "mongoose";
import { IJobTitle } from "../../../types/interfaces/jobTitle.interface";
import Personnel from "./personnel";

//create jobTitle model with schema for save in DB
const JobTitleSchema: Schema<IJobTitle> = new Schema({
    name: { type: String, required: true },
    create_date: { type: Date, default: Date.now }
}, {
    collection: "Job"
});

JobTitleSchema.post(["remove", "deleteOne", "deleteMany","findOneAndDelete","findOneAndRemove"], async (doc) => {
    const defaultJobTitleId = (await JobTitle.findOne({ name: "default" }))?._id;
    let updated_personnel = await Personnel.updateMany({
        job_id: doc._id,
    }, { $set: { job_id: defaultJobTitleId } }, { returnDocument: "after" }).exec();
});

// Compile model from schema
const JobTitle = mongoose.model("JobTitle", JobTitleSchema);
export default JobTitle;