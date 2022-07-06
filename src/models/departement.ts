import mongoose, { Schema, Document } from "mongoose";

//define departement type
export interface IDepartement extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    created_date: Date;
}


//create departement model with schema for save in DB
const DepartementSchema: Schema<IDepartement> = new Schema({
    name: { type: String, required: true },
    created_date: { type: Date, default: Date.now }
},{
    collection: "Department"
});

// Compile model from schema
const Departement = mongoose.model("Departement", DepartementSchema);
export default Departement;
