import mongoose, { Schema, Document } from "mongoose";

//create section model with schema for save in DB
const SectionSchema: Schema<ISection> = new Schema({
    name: { type: String, required: true },
    //add relational document to department
    department_id: { type: Schema.Types.ObjectId, ref: "Department" },
    create_date: { type: Date, default: Date.now }
}, {
    collection: "Section"
});

// Compile model from schema
const Section = mongoose.model("Section", SectionSchema);
export default Section;