import mongoose, { Schema, Document } from "mongoose";
import { ICarBrand } from "../../../types/interfaces/car.interface";
import Car from "./car";

//create car_brand model with schema for save in DB
const CarBrandSchema: Schema<ICarBrand> = new Schema({
    name: { type: String, required: true },
}, {
    collection: "Car_Brand"
});

CarBrandSchema.post("remove", async (doc) => {
    const defaultCarBrandId = (await CarBrand.findOne({ name: "default" }))?._id;
    let updated_cars = await Car.updateMany({
        brand: doc._id,
    }, { $set: { brand: defaultCarBrandId } }, { returnDocument: "after" }).exec();
});

// Compile model from schema
const CarBrand = mongoose.model("Car_Brand", CarBrandSchema);
export default CarBrand;
