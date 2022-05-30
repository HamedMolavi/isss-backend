import mongoose, { Schema, Document } from "mongoose";

//define plate type
export interface IPlate extends Document {
    _id: mongoose.Types.ObjectId;
    number: string,
    carBrand: string;
    color: string;
    owner: string;
    create_date: Date;
}


//create plate model with schema for save in DB
const PlateSchema: Schema<IPlate> = new Schema({
    number: { type: String, required: true },
    carBrand: { type: String, required: true },
    color: { type: String, required: true },
    owner: { type: String, required: true },
    create_date: { type: Date, default: Date.now }
});

// Compile model from schema
const Plate = mongoose.model("Plate", PlateSchema);
export default Plate;