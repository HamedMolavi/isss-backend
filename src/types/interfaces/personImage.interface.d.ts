import { Schema } from "mongoose";
export { };
declare global{
  //define person_image type
  interface IPersonImage extends Document {
    _id: Schema.Types.ObjectId;
    person_id: Schema.Types.ObjectId;
    hash_id: string;
    vector: [Number];
  };
};