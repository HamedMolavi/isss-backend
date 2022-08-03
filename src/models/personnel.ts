import mongoose, { Schema, Document } from "mongoose";
import path from "path";

//define personnel type
export interface IPersonnel extends Document {
  _id: mongoose.Types.ObjectId;
  first_name: string;
  last_name: string;
  national_code: string;
  email: string;
  phone_number: string;
  job_id: mongoose.Types.ObjectId;
  personnel_code: string;
  section_id: mongoose.Types.ObjectId;
  camera_whitelist: mongoose.Types.ObjectId[];
  image_id: mongoose.Types.ObjectId;
  is_active: boolean;
  is_employee: boolean;
  is_dismissed: boolean;
  create_date: Date;
}

//create personnel model with schema for save in DB
const PersonnelSchema: Schema<IPersonnel> = new Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    national_code: { type: String, required: true },
    email: { type: String, required: true },
    phone_number: { type: String, required: true },
    job_id: { type: Schema.Types.ObjectId, ref: "JobTitle", required: true },
    personnel_code: { type: String, required: true },
    section_id: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    camera_whitelist: [{ type: Schema.Types.ObjectId, ref: "Camera" }],
    image_id: { type: Schema.Types.ObjectId, required: true },
    is_active: { type: Boolean, default: false },
    is_employee: { type: Boolean, default: false },
    is_dismissed: { type: Boolean, default: false },
    create_date: { type: Date, default: Date.now },
  },
  {
    collection: "Personnel",
  }
);

//define path for save image
let pathSave = path.join(__dirname, "./../../assets/image/");

//get personnel data jason for auth
PersonnelSchema.methods.toJSON = function () {
  return {
    _id: this._id,
    first_name: this.first_name,
    last_name: this.last_name,
    national_code: this.national_code,
    email: this.email,
    phone_number: this.phone_number,
    job_id: this.job_id,
    personnel_code: this.personnel_code,
    section_id: this.section_id,
    camera_whitelist: this.camera_whitelist,
    image_id: this.image_id,
    is_active: this.is_active,
    is_employee: this.is_employee,
    is_dismissed: this.is_dismissed,
    create_date: this.create_date,
    image_url : pathSave + this.personnel_code+"/" + "avatar.jpg",
  };
};

// Compile model from schema
const Personnel = mongoose.model("Personnel", PersonnelSchema);
export default Personnel;
