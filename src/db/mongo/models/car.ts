import mongoose, { Schema, Document } from "mongoose";
import { ICar } from "../../../types/interfaces/car.interface";
import Personnel from "./personnel";
import JobTitle from "./jobTitle";



//create car model with schema for save in DB
const CarSchema: Schema<ICar> = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "Personnel", required: true },
  number_plate: { type: String, required: true },
  brand: { type: Schema.Types.ObjectId, ref: "Car_Brand", required: true },
  color: { type: Schema.Types.ObjectId, ref: "Car_Color", required: true },
  camera_whitelist: { type: [mongoose.Types.ObjectId], ref: "Camera", default: [] },
  section_whitelist: { type: [Schema.Types.ObjectId], ref: "Section", default: [] },
  schedule_whitelist: { type: [Schema.Types.ObjectId], ref: "Schedule", default: [] },
  department_whitelist: { type: [Schema.Types.ObjectId], ref: "Department", default: [] },
  allowed_pass: { type: Number },
  tracked: { type: Boolean, default: false },
  create_date: { type: Date, default: Date.now }
}, {
  collection: "Car"
});

CarSchema.pre('save', function (next) {
  Personnel.findById(this.owner).exec()
    .then((owner) => JobTitle.findById(owner?.job_id).exec())
    .then((job) => job?.name)
    .then((name) => {
      if (!name) return next();
      switch (true) {
        case ["default", "guest", "مهمان", "میهمان"].includes(name):
          if (!Number.isInteger(this.allowed_pass)) this.allowed_pass = 0;
          break;
        default:
          this.allowed_pass = undefined;
          delete this.allowed_pass
          break;
      };
      return next();
    })
    .catch(next)
});

// Compile model from schema
const Car = mongoose.model("Car", CarSchema);
export default Car;