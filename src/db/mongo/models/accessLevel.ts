import mongoose, { ObjectId, Schema } from "mongoose";
import { IAccessLevel, accessList } from "../../../types/interfaces/accessLevel.interface";
import { authHexToObject } from "../../../tools/utils.tools";

//create AccessLevel model with schema for save in DB
const AccessLevelSchema: Schema<IAccessLevel> = new Schema(
  {
    name: { type: String, required: true },
    camera: { type: Number, default: 0, min: 0, max: 15 },
    car: { type: Number, default: 0, min: 0, max: 15 },
    color: { type: Number, default: 0, min: 0, max: 15 },
    brand: { type: Number, default: 0, min: 0, max: 15 },
    section: { type: Number, default: 0, min: 0, max: 15 },
    department: { type: Number, default: 0, min: 0, max: 15 },
    job: { type: Number, default: 0, min: 0, max: 15 },
    personnel: { type: Number, default: 0, min: 0, max: 15 },
    schedule: { type: Number, default: 0, min: 0, max: 15 },
    user: { type: Number, default: 0, min: 0, max: 15 },
    typeName: { type: Number, default: 0, min: 0, max: 15 },
    systemLog: { type: Number, default: 0, min: 0, max: 15 },
  },
  {
    collection: "AccessLevel",
  }
);

// AccessLevelSchema.post('save', async (doc)=>{});
// AccessLevelSchema.post(["remove", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"], async (doc) => { });
AccessLevelSchema.methods.toJSON = function () {
  const doc = this;
  let result: any = {};
  for (const access of accessList) result[access] = authHexToObject(doc[access]);
  return {
    _id: doc.id,
    name: doc.name,
    ...result,
  };
};

// Compile model from schema
const AccessLevel = mongoose.model("AccessLevel", AccessLevelSchema);
export default AccessLevel;
