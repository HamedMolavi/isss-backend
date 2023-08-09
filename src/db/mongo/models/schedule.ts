import mongoose, { Schema, Document } from "mongoose";
import { ISchedule } from "../../../types/interfaces/schedule.interface";

//create Schedule with schema for save in DB
const ScheduleSchema: Schema<ISchedule> = new Schema({
    start_cron: { type: String, required: true },
    stop_cron: { type: String, required: true },
    model_camera_id: { type: Schema.Types.ObjectId, ref: 'ModelToCamera', required: true },
    config: { type: Object }
},{
    collection: "Schedule"
});

// Compile model from schema
const Schedule = mongoose.model("Schedule", ScheduleSchema);

export default Schedule;