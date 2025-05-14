import mongoose, { Schema } from "mongoose";

//define LogType type
export interface ILogType extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  filePath?: string;
  defaultConfig?: {
    timeDuplicationDiagnoses: number;
    threshold: number;
    min_people: number;
    max_people: number;
  };
}
