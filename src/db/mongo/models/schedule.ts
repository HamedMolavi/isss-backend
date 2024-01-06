import mongoose, { Schema, Document } from "mongoose";
import { ISchedule, IOperation } from "../../../types/interfaces/schedule.interface";

//create Schedule with schema for save in DB
const ScheduleSchema: Schema<ISchedule> = new Schema(
  {
    start_cron: { type: String, required: true },
    stop_cron: { type: String, required: true },
    model_camera_id: { type: Schema.Types.ObjectId, ref: "ModelToCamera", required: true },
    operations: { type: [Object], required: true },
    is_running: { type: Boolean, default: false },
  },
  {
    collection: "Schedule",
  }
);


//get Schedule data json
ScheduleSchema.methods.toJSON = function () {
  let operations = this.operations.map((operation: IOperation) => {
    return {
      timeDuplicationDiagnoses: operation?.timeDuplicationDiagnoses ?? 0,
      threshold: operation?.threshold != undefined ? operation?.threshold / 100 : 0,
      zone: !!operation?.zone ? operation?.zone : [0, 0, 1, 1],
      min_people: operation?.min_people ?? 0,
      max_people: operation?.max_people ?? 0,
      logs: operation.logs,
    }
  })
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
    operations
  };
};


// Compile model from schema
const Schedule = mongoose.model("Schedule", ScheduleSchema);

export default Schedule;
