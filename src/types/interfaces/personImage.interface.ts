import { Document, Schema } from "mongoose";

//define person_image type
export interface IPersonImage extends Document {
  _id: Schema.Types.ObjectId;
  person_id: Schema.Types.ObjectId;
  hash_id:string;
 // masked_face_id : string;
  vector: [Number];
//  masked_embd:[Number]
};

