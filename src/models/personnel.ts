import mongoose, { Schema, Document } from "mongoose";

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
    image_id : mongoose.Types.ObjectId;
    is_active: boolean;
    is_employee: boolean;
    is_dismissed: boolean;
    create_date: Date;
}

//create personnel model with schema for save in DB
const PersonnelSchema: Schema<IPersonnel> = new Schema({
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    national_code: {type: String, required: true},
    email: {type: String, required: true},
    phone_number: {type: String, required: true},
    job_id: {type: Schema.Types.ObjectId, ref: "JobTitle", required: true},
    personnel_code: {type: String, required: true},
    section_id: {type: Schema.Types.ObjectId, ref: "Section", required: true},
    camera_whitelist: [{type: Schema.Types.ObjectId, ref: "Camera"}],
    image_id: {type: Schema.Types.ObjectId, required: true},
    is_active: {type: Boolean, default: false},
    is_employee: {type: Boolean, default: false},
    is_dismissed: {type: Boolean, default: false},
    create_date: {type: Date, default: Date.now}
},{
    collection: "Personnel"
});

// Compile model from schema
const Personnel = mongoose.model("Personnel", PersonnelSchema);
export default Personnel;