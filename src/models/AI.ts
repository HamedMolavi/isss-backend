import mongoose, { Schema } from "mongoose";

//define AI type
interface IAI {
    start: string;
    end: string;
    thresholdid: string;
    minTime: string;
    zone: String[];
    type: string;
    minPeople: number;
    maxPeople: number;
}

//create AI model with schema for save in DB
const AISchema: Schema<IAI> = new Schema({
    start: { type: String, required: true },
    end: { type: String, required: true },
    thresholdid: { type: String, required: false },
    minTime: { type: String, required: false },
    zone: { type: [String], required: true },
    type: { type: String, required: true },
    minPeople: { type: Number, required: false },
    maxPeople: { type: Number, required: false },
});

// Compile model from schema
const AI = mongoose.model("AI", AISchema);
export default AI;