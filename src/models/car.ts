import mongoose, { Schema , Document } from "mongoose";

//define car type
export interface ICar extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
}


//create car model with schema for save in DB
const CarSchema: Schema<ICar> = new Schema({
    name: { type: String, required: true },
});

// Compile model from schema
const Car = mongoose.model("Car", CarSchema);
export default Car;
