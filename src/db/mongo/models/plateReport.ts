import mongoose, { Schema } from "mongoose";
import { IPlateReport } from "../../../types/interfaces/plateReport.interface";
// db.vehicles.createIndex({ plate_number: 1 }, { collation: { locale: 'en', strength: 1 } });

const PlateReportSchema: Schema<IPlateReport> = new Schema(
  {
    direction: { type: String, required: true },
    plate_number: { type: String, required: true },
    frame: { type: String, required: true },
    inner_crop: { type: String, required: true },
    crop: { type: String, required: true },
    color: { type: String, required: true },
    brand: { type: String, required: true },
    speed: { type: String, required: true },
    camera_id: { type: String, required: true },
    confidence: { type: String, required: true },
    timestamp: { type: Number, required: true },
    bbox: { type: [Number, Number, Number, Number], required: true },
    inner_bbox: { type: [Number, Number, Number, Number], required: true },
    track_id: { type: String, required: true },
  },
  {
    collection: "plates",
    toJSON: {
      transform(_doc, ret) {
        return ret;
      },
    }
  }
);



const PlateReport = mongoose.model("PlateReport", PlateReportSchema);
export default PlateReport;
