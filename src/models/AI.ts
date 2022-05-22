import mongoose, { Schema } from "mongoose";

//define AI type
interface IAI {
    start: string;
    end: string;
    thresholdid: string;
    minTime: string;
    zone: String[];
}

//create AI model with schema for save in DB
const AISchema: Schema<IAI> = new Schema({
    start: { type: String, required: true },
    end: { type: String, required: true },
    thresholdid: { type: String, required: true },
    minTime: { type: String, required: false },
    zone: { type: [String], required: true },
});

// Compile model from schema
const AI = mongoose.model("Personnel", AISchema);
export default AI;