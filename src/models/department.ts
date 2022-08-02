import mongoose, { Schema, Document } from "mongoose";

//define department type
export interface IDepartment extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    created_date: Date;
}


//create department model with schema for save in DB
const DepartmentSchema: Schema<IDepartment> = new Schema({
    name: { type: String, required: true },
    created_date: { type: Date, default: Date.now }
},{
    collection: "Department"
});

// Compile model from schema
const Department = mongoose.model("Department", DepartmentSchema);
export default Department;
