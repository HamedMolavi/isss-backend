import mongoose from "mongoose";
export { };
declare global{
  //define jobTitle type
  interface IJobTitle extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    create_date: Date;
  };
};