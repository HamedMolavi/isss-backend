import mongoose, { Schema, Document, Model } from "mongoose";

//define departement type
interface IDepartement {
    name: string;
}


//create departement model with schema for save in DB
const DepartementSchema: Schema<IDepartement> = new Schema({
    name: { type: String, required: true },
});

// Compile model from schema
const Departement = mongoose.model("Departement", DepartementSchema);
export default Departement;