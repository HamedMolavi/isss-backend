import mongoose, { Schema } from "mongoose";
import { IDepartment } from "../../../types/interfaces/department.interface";
import Section from "./section";




//create department model with schema for save in DB
const DepartmentSchema: Schema<IDepartment> = new Schema({
    name: { type: String, required: true },
    created_date: { type: Date, default: Date.now }
}, {
    collection: "Department"
});

DepartmentSchema.post(["remove", "deleteOne", "deleteMany","findOneAndDelete","findOneAndRemove"], async (doc) => {
    const defaultDepartmentId = (await Department.findOne({ name: "default" }))?._id
    let updated_sections = await Section.updateMany({
        department_id: doc._id,
    }, { $set: { department_id: defaultDepartmentId } }, { returnDocument: "after" }).exec();
});


// Compile model from schema
const Department = mongoose.model("Department", DepartmentSchema);
export default Department;
