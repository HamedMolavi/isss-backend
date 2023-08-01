import mongoose, { Schema, Document } from "mongoose";
import { ICar } from "../interfaces/car.interface";



//create car model with schema for save in DB
const CarSchema: Schema<ICar> = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: "Personnel" },
    number_plate: { type: String, required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Car_Brand" },
    color: { type: Schema.Types.ObjectId, ref: "Car_Color" },
    camera_whitelist: [Schema.Types.ObjectId],
    tracked: { type: Boolean, default: false },
    create_date: { type: Date, default: Date.now }
}, {
    collection: "Car"
});

// Compile model from schema
const Car = mongoose.model("Car", CarSchema);
export default Car;