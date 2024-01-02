import mongoose, { Schema } from "mongoose";
import { IAccessLevel } from "../../../types/interfaces/accessLevel.interface";

//create AccessLevel model with schema for save in DB
const AccessLevelSchema: Schema<IAccessLevel> = new Schema(
  {
    name: { type: String, required: true },
    camera: { type: Number, default: 0, min: 0, max: 15 },
  },
  {
    collection: "AccessLevel",
  }
);

// AccessLevelSchema.post('save', async (doc)=>{});
// AccessLevelSchema.post(["remove", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"], async (doc) => { });

// Compile model from schema
const AccessLevel = mongoose.model("AccessLevel", AccessLevelSchema);
export default AccessLevel;
