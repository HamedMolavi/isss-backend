import mongoose, { Schema, Document } from "mongoose";

//define car type
export interface ICar extends Document {
    _id: Schema.Types.ObjectId;
    owner: Schema.Types.ObjectId;
    number_plate: string;
    brand: Schema.Types.ObjectId;
    color: Schema.Types.ObjectId;
    camera_whitelist: Schema.Types.ObjectId[];
    create_date: Date;
}


//create car model with schema for save in DB
const CarSchema: Schema<ICar> = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: "Personnel" },
    number_plate: { type: String, required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Car_Brand" },
    color: { type: Schema.Types.ObjectId, ref: "Car_Color" },
    camera_whitelist: [Schema.Types.ObjectId],
    create_date: { type: Date, default: Date.now }
},{
    collection: "Car"
});

// Compile model from schema
const Car = mongoose.model("Car", CarSchema);
export default Car;