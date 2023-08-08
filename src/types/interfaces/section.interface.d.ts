import mongoose from "mongoose";
export { };
declare global{
  //define section type
  interface ISection extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    department_id: mongoose.Types.ObjectId;
    create_date: Date;
  };

};