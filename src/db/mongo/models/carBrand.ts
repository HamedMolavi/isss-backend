import mongoose, { Schema, Document } from "mongoose";
import { ICarBrand } from "../../../types/interfaces/car.interface";

//create car_brand model with schema for save in DB
const CarBrandSchema: Schema<ICarBrand> = new Schema({
    name: { type: String, required: true },
    system: { type: Boolean, default: false },
}, {
    collection: "Car_Brand"
});

const CarBrand = mongoose.model("Car_Brand", CarBrandSchema);
export default CarBrand;
