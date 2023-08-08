import { Schema } from "mongoose";
export { };
declare global{
  //define Model type
  interface IModel extends Document {
    _id: Schema.Types.ObjectId;
    name: string;
    category: string;
    uri: string;
  };
};