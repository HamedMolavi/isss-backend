import mongoose, { Schema } from 'mongoose';
import { IModel } from '../../../types/interfaces/model.interface';
import ModelToCamera from './modelToCamera';
import Schedule from './schedule';

//create Model  with schema for save in DB
const ModelSchema: Schema<IModel> = new Schema(
	{
		name: { type: String, required: true },
		category: { type: String, required: true },
		uri: { type: String, required: true }
	},
	{
		collection: 'Model'
	}
);

ModelSchema.post(
	['remove', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove'],
	async (doc) => {
		let deleted_model_to_cameras = await ModelToCamera.find({ model_id: doc._id }).exec();
		await ModelToCamera.deleteMany(
			{
				model_id: doc._id
			},
			{ returnDocument: 'before' }
		).exec();
		deleted_model_to_cameras.forEach((model_camera) =>
			Schedule.deleteMany({ model_camera_id: model_camera._id }).exec()
		);
		//TODO: do something about orphaned cameras
	}
);

// Compile Model from schema
const Model = mongoose.model('Model', ModelSchema);
export default Model;
