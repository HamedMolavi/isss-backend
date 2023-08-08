import mongoose, { Schema  } from "mongoose";



//create car_color model with schema for save in DB
const CarColorSchema: Schema<ICarColor> = new Schema({
    name: { type: String, required: true },
},{
    collection: "Car_Color"
});

// Compile model from schema
const CarColor = mongoose.model("Car_Color", CarColorSchema);
export default CarColor;
