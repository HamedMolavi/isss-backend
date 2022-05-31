import mongoose, { Schema, Document } from "mongoose";

//define car type
export interface ICar extends Document {
    _id: mongoose.Types.ObjectId;
    owner: string,
    number_plate: string;
    brand_id: mongoose.Types.ObjectId;
    color_id: mongoose.Types.ObjectId;
    camera_whitelist: string[];
    create_date: Date;
}


//create car model with schema for save in DB
const CarSchema: Schema<ICar> = new Schema({
    owner: { type: String, required: true },
    number_plate: { type: String, required: true },
    brand_id: { type: Schema.Types.ObjectId, ref: "Car_Brand" },
    color_id: { type: Schema.Types.ObjectId, ref: "Car_Color" },
    camera_whitelist: { type: [String] },
    create_date: { type: Date, default: Date.now }
});

// Compile model from schema
const Car = mongoose.model("Car", CarSchema);
export default Car;