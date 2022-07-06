import mongoose, { Schema, Document } from "mongoose";

//define section type
export interface ISection extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    departement_id: mongoose.Types.ObjectId;
    create_date: Date;
}


//create section model with schema for save in DB
const SectionSchema: Schema<ISection> = new Schema({
    name: { type: String, required: true },
    //add realational ducoment to departement
    departement_id: { type: Schema.Types.ObjectId, ref: "Departement" },
    create_date: { type: Date, default: Date.now }
}, {
    collection: "Section"
});

// Compile model from schema
const Section = mongoose.model("Section", SectionSchema);
export default Section;