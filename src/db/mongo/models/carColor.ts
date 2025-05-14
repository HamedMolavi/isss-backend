import mongoose, { Schema, Document } from "mongoose";
import { ICarColor } from "../../../types/interfaces/car.interface";
import Car from "./car";



//create car_color model with schema for save in DB
const CarColorSchema: Schema<ICarColor> = new Schema({
    name: { type: String, required: true },
    fa_name: { type: String, required: true }
}, {
    collection: "Car_Color"
});

CarColorSchema.post(["remove", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"], async (doc) => {
    const defaultCarColorId = (await CarColor.findOne({ name: "unknown" }))?._id;
    let updated_cars = await Car.updateMany({
        color: doc._id,
    }, { $set: { color: defaultCarColorId } }, { returnDocument: "after" }).exec();
});

// Compile model from schema
const CarColor = mongoose.model("Car_Color", CarColorSchema);
export default CarColor;
