import { Schema } from "mongoose";
export { };
declare global{
  //define ModelToCamera type
  interface IModelToCamera extends Document {
    _id: Schema.Types.ObjectId;
    model_id: Schema.Types.ObjectId;
    camera_id: Schema.Types.ObjectId;
    is_enabled: boolean;
  };
};