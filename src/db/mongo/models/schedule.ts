import mongoose, { Schema, Document } from "mongoose";
import { ISchedule } from "../../../types/interfaces/schedule.interface";
import Time from "../../../tools/time.tools";
import { Clock, DayOfWeek } from "../../../types/interfaces/time.interface";

//create Schedule with schema for save in DB
const ScheduleSchema: Schema<ISchedule> = new Schema(
  {
    start_cron: { type: String, required: true },
    stop_cron: { type: String, required: true },
    model_camera_id: {
      type: Schema.Types.ObjectId,
      ref: "ModelToCamera",
      required: true,
    },
    config: { type: Object },
    is_running: { type: Boolean, default: false },
  },
  {
    collection: "Schedule",
  }
);


//get Schedule data json
ScheduleSchema.methods.toJSON = function () {
  return {
    _id: this._id,
    start_cron: {
      min: this.start_cron.split(" ")[0],
      hour: this.start_cron.split(" ")[1],
      dow: this.start_cron.split(" ")[4].split(",") ?? ["*"],
    },
    stop_cron: {
      min: this.stop_cron.split(" ")[0],
      hour: this.stop_cron.split(" ")[1],
      dow: this.stop_cron.split(" ")[4].split(",") ?? ["*"],
    },
    model_camera_id: this.model_camera_id,
    config: {
      timeDuplicationDiagnoses:
        this.config.timeDuplicationDiagnoses ?? 0,
      threshold:
        this.config?.threshold != 0
          ? this.config?.threshold * 100
          : 0,
      zones: this.config.zones ?? null,
      min_people: this.config.min_people ?? 0,
      max_people: this.config.max_people ?? 0,
    },
  };
};


// Compile model from schema
const Schedule = mongoose.model("Schedule", ScheduleSchema);

export default Schedule;