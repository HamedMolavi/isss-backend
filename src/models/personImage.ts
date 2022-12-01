import mongoose, { Schema, Document } from "mongoose";

//define person_image type
export interface IPersonImage extends Document {
    _id: Schema.Types.ObjectId;
    person_id: Schema.Types.ObjectId;
    hash_id:string;
    vector: [Number];
}

//create Model person_image with schema for save in DB
const PersonImageSchema: Schema<IPersonImage> = new Schema({
    person_id: { type: Schema.Types.ObjectId, ref: "Personnel" },
    hash_id : {type:String, required:true},
    vector: [Number]
},{
    collection: "Person_Image"
});

// Compile Model from schema
const PersonImage = mongoose.model("Person_Image", PersonImageSchema);
export default PersonImage;


//[{type: Number}]