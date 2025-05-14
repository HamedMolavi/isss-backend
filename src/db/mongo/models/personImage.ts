import mongoose, { Schema } from "mongoose";
import { IPersonImage } from "../../../types/interfaces/personImage.interface";

//create Model person_image with schema for save in DB
const PersonImageSchema: Schema<IPersonImage> = new Schema({
  _id: { type: mongoose.Types.ObjectId, required: true },
  person_id: { type: Schema.Types.ObjectId, ref: "Personnel" },
  hash_id: { type: String, required: true },
  //  masked_face_id :{type : String , required : false},
  vector: [Number],
  //masked_embd:[Number]
}, {
  collection: "Person_Image",
  _id: false
});

// Compile Model from schema
const PersonImage = mongoose.model("Person_Image", PersonImageSchema);
export default PersonImage;


//[{type: Number}]