import mongoose from "mongoose";
export { };
declare global{
  //define department type
  interface IDepartment extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    created_date: Date;
  };
};