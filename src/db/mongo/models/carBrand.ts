import mongoose, { Schema, Document } from "mongoose";

export interface ICarBrand extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    fa_name: string;
    slug: string;
}

//create car_brand model with schema for save in DB
const CarBrandSchema: Schema<ICarBrand> = new Schema({
    name: { type: String, required: true },
    fa_name: { type: String, required: true },
    slug: { type: String, required: true },
}, {
    collection: "Car_Brand"
});

const CarBrand = mongoose.model("Car_Brand", CarBrandSchema);
export default CarBrand;
