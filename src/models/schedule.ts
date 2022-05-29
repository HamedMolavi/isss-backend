import mongoose, { Schema } from "mongoose";

//define schedule type
export interface ISchedule {
    _id: mongoose.Types.ObjectId;
    model_camera_id: mongoose.Types.ObjectId;
    start_cron: string;
    stop_cron: string;
    config: IConfig;
}
//define config type
interface IConfig {
    threshold: number;
    min_people: number;
    max_people: number;
    zones: [[number, number, number, number]];
}


//create Schedule with schema for save in DB
const ScheduleSchema: Schema<ISchedule> = new Schema({
    start_cron: { type: String, required: true },
    stop_cron: { type: String, required: true },
    model_camera_id: { type: Schema.Types.ObjectId, ref: 'ModelCamera', required: true },
    config: { type: Object }
});

// Compile model from schema
const Schedule = mongoose.model("Schedule", ScheduleSchema);
export default Schedule;