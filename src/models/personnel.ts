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
    is_active: { type: Boolean, default: false },
    is_employee: { type: Boolean, default: false },
    is_dismissed: { type: Boolean, default: false },
    create_date: { type: Date, default: Date.now },
  },
  {
    collection: "Personnel",
  }
);

//get personnel data jason for auth
PersonnelSchema.methods.toJSON = function () {
  //define path for save image
  let pathSave = path.join(__dirname, `./../../assets/image/${this.personnel_code}`);
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
    image_url : "192.168.1.39:8000/api/v1/files/download/default",
    //image_url: pathSave != null ? pathSave + this.personnel_code + "/" + "avatar.jpg" : "192.168.1.39:8000/api/v1/files/download/default",
  };
};

// Compile model from schema
const Personnel = mongoose.model("Personnel", PersonnelSchema);
export default Personnel;
