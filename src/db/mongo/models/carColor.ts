import mongoose, { Schema, Document } from "mongoose";
export interface ICarColor extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    fa_name: string;
    slug: string;
}

//create car_color model with schema for save in DB
const CarColorSchema: Schema<ICarColor> = new Schema({
    name: { type: String, required: true },
    fa_name: { type: String, required: true },
    slug: { type: String, required: true },
}, {
    collection: "Car_Color"
});

const CarColor = mongoose.model("Car_Color", CarColorSchema);
export default CarColor;
