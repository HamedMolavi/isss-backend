import mongoose, { Schema, Document } from "mongoose";

//define car_brand type
export interface ICarBrand extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
}


//create car_brand model with schema for save in DB
const CarBrandSchema: Schema<ICarBrand> = new Schema({
    name: { type: String, required: true },
},{
    collection: "Car_Brand"
});

// Compile model from schema
const CarBrand = mongoose.model("Car_Brand", CarBrandSchema);
export default CarBrand;
