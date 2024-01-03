import mongoose, { Schema, Document } from "mongoose";
import { ISection } from "../../../types/interfaces/section.interface";
import Personnel from "./personnel";

//create section model with schema for save in DB
const SectionSchema: Schema<ISection> = new Schema({
    name: { type: String, required: true },
    //add relational document to department
    department_id: { type: Schema.Types.ObjectId, ref: "Department" },
    is_enabled: { type: Boolean, default: true },
    create_date: { type: Date, default: Date.now }
}, {
    collection: "Section"
});

SectionSchema.post(["remove", "deleteOne", "deleteMany","findOneAndDelete","findOneAndRemove"], async (doc) => {
    const defaultSectionId = (await Section.findOne({ name: "default" }))?._id;
    let updated_personnel = await Personnel.updateMany({
        section_id: doc._id,
    }, { $set: { section_id: defaultSectionId } }, { returnDocument: "after" }).exec();
});

// Compile model from schema
const Section = mongoose.model("Section", SectionSchema);
export default Section;