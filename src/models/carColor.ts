import mongoose, { Schema , Document } from "mongoose";

//define car_color type
export interface ICarColor extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
}


//create car_color model with schema for save in DB
const CarColorSchema: Schema<ICarColor> = new Schema({
    name: { type: String, required: true },
},{
    collection: "Car_Color"
});

// Compile model from schema
const CarColor = mongoose.model("Car_Color", CarColorSchema);
export default CarColor;
