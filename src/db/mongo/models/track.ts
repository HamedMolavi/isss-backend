import mongoose, { Schema } from 'mongoose';
import { ITrackLog } from '../../../types/interfaces/track.interface';

//create track log model with schema for save in DB
const TrackLogSchema: Schema<ITrackLog> = new Schema(
	{
		uid: { type: String, required: true }, // personnel_id OR number_plate
		day: { type: Number, required: true }, // unix day since UTC
		data: Array<{
			camera_id: { type: string; required: true };
			start: { type: number; required: true };
			end: { type: number; required: true };
		}>
	},
	{
		collection: 'Track'
	}
);

// Compile model from schema
const Track = mongoose.model('Track', TrackLogSchema);
export default Track;
