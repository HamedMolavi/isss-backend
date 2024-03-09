import mongoose, { Document } from "mongoose";

export interface TrackLogData {
  camera_id: string;
  start: number;
  end: number;
}

//define track type
export interface ITrackLog extends Document {
  _id: mongoose.Types.ObjectId;
  uid: string; // personnel_id OR number_plate
  day: number; // unix day since UTC
  data: Array<TrackLogData>
};

