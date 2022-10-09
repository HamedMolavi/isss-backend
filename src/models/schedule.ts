import mongoose, { Schema, Document } from "mongoose";

//define schedule type
export interface ISchedule extends Document {
    _id: Schema.Types.ObjectId;
    model_camera_id: Schema.Types.ObjectId;
    start_cron: string;
    stop_cron: string;
    config: IConfig;
}
//define config type
interface IConfig {
    timeDuplicationDiagnoses : number;
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
},{
    collection: "Schedule"
});

// Compile model from schema
const Schedule = mongoose.model("Schedule", ScheduleSchema);

export default Schedule;