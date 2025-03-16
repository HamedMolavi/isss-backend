import mongoose, { Schema } from "mongoose";

//define camera type
export interface IPlateReport extends Document {
  _id: mongoose.Types.ObjectId;
  direction: string;
  plate_number: string;
  frame: string;
  inner_crop: string;
  crop: string;
  color: string;
  brand: string;
  speed: string;
  camera_id: string;
  timestamp: number;
  confidence: string;
  bbox: [number, number, number, number];
  inner_bbox: [number, number, number, number];
  track_id: string;

  // track_id: string;
  // plate_type: string;
}
