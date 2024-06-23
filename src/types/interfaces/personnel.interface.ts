import { Document, Schema } from "mongoose";

//define personnel type
export interface IPersonnel extends Document {
  _id: Schema.Types.ObjectId;
  first_name: string;
  last_name: string;
  national_code: string;
  email: string;
  phone_number: string;
  job_id: Schema.Types.ObjectId;
  personnel_code: string;
  camera_whitelist: Schema.Types.ObjectId[];
  department_whitelist: Schema.Types.ObjectId[];
  section_whitelist: Schema.Types.ObjectId[];
  schedule_whitelist: Schema.Types.ObjectId[];
  allowed_pass: {"start": number, "end": number} | undefined;
  tracked: boolean;
  create_date: Date;
  alert: boolean;
  toName: () => string;
};
