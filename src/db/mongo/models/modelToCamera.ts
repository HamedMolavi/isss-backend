import mongoose, { Schema } from 'mongoose';
import { IModelToCamera } from '../../../types/interfaces/modelToCamera.interface';
import Schedule from './schedule';

//create Model ModelToCamera with schema for save in DB
const ModelToCameraSchema: Schema<IModelToCamera> = new Schema(
	{
		model_id: { type: Schema.Types.ObjectId, ref: 'Model' },
		camera_id: { type: Schema.Types.ObjectId, ref: 'Camera' },
		is_enabled: { type: Boolean, default: true }
	},
	{
		collection: 'Model_Camera'
	}
);

ModelToCameraSchema.post(
	['remove', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove'],
	async (doc) => {
		let deleted_schedules = await Schedule.find({ model_camera_id: doc._id }).exec();
		await Schedule.deleteMany(
			{
				model_camera_id: doc._id
			},
			{ returnDocument: 'after' }
		).exec();
		//TODO: do something about orphaned camera
	}
);

// Compile Model from schema
const ModelToCamera = mongoose.model('ModelToCamera', ModelToCameraSchema);

export default ModelToCamera;
