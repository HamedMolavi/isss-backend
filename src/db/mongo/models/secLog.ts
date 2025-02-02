import mongoose, { Schema } from "mongoose";
import { ILog } from "../../../types/interfaces/secLog.interface";
import { JSON_hash } from "../../../tools/utils.tools";

const LogSchema: Schema<ILog> = new Schema({
  level: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  message: { type: String, required: true },
  hash: { type: String, required: true },
  meta: { type: Object, default: {} }
}, {
  minimize: false,
  collection: "Log",
  capped: { size: 500 * 1024 },
  timestamps: { createdAt: true, updatedAt: true },
  writeConcern: { j: false }
});
LogSchema.pre('insertMany', function (next, docs) {
  docs = docs?.map(JSON_hash)
  return next();
});
LogSchema.pre('save', function (next, opts) {
  this.hash = JSON_hash(this).hash
  return next();
})
export const Log = mongoose.model("test", LogSchema);