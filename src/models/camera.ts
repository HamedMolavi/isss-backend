import mongoose, { Schema, Document } from "mongoose";

//define camera type
export interface ICamera extends Document {
    _id: mongoose.Types.ObjectId;
    network: string;
    departement_id: mongoose.Types.ObjectId,
    section_id: mongoose.Types.ObjectId,
    url: string,
    ip: string,
    name: string;
    username: string;
    password: string;
    is_enabled: boolean;
    create_date: Date;
}


//create camera model with schema for save in DB
const CameraSchema: Schema<ICamera> = new Schema({
    network: { type: String, required: true },
    departement_id: { type: Schema.Types.ObjectId, ref: 'Departement', required: true },
    section_id: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    url: { type: String, required: true },
    ip: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    is_enabled: { type: Boolean, required: true },
    create_date: { type: Date, default: Date.now }
}, {
    collection: "Camera"
});

// Compile model from schema
const Camera = mongoose.model("Camera", CameraSchema);
export default Camera;