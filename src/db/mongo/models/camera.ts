import mongoose, { Schema } from 'mongoose';
import Model from './model';
import ModelToCamera from './modelToCamera';
import Schedule from './schedule';
import { CameraTypes } from '../../../types/enums/camera.enum';
import { ICamera } from '../../../types/interfaces/camera.interface';
import { balanceNewCamera } from '../../../tools/loadBalancer.tools';
import User from './user';
import Personnel from './personnel';

//create camera model with schema for save in DB
const CameraSchema: Schema<ICamera> = new Schema(
	{
		section_id: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
		url: { type: String, required: true },
		nvr: { type: String, required: false },
		ip: { type: String, required: true },
		network: { type: String, default: '255.255.255.0' },
		name: { type: String, required: true },
		username: { type: String, required: true },
		password: { type: String, required: true },
		is_enabled: { type: Boolean, required: true },
		damaged: { type: Boolean, required: false, default: false },
		create_date: { type: Date, default: Date.now },
		camera_type: {
			type: String,
			required: true,
			enum: Object.values(CameraTypes) as string[],
			default: CameraTypes.enter
		}
	},
	{
		collection: 'Camera',
		toJSON: {
			transform(_doc, ret) {
				delete ret['url'];
				delete ret['nvr'];
				delete ret['ip'];
				delete ret['network'];
				delete ret['username'];
				delete ret['password'];
				return ret;
			}
		}
	}
);

CameraSchema.post('save', balanceNewCamera);

CameraSchema.post(
	['remove', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove'],
	async (doc) => {
		const model_cameras = await ModelToCamera.find({ camera_id: doc._id }).exec();
		let models = await Model.find({}).exec();
		let users = await User.find({ is_active: true }).exec();
		let personnel = await Personnel.find({}).exec();
		users = users.filter((user) =>
			user.camera_access?.map((camera_id) => camera_id.toString()).includes(doc._id.toString())
		);
		personnel = personnel.filter((person) =>
			person.camera_whitelist?.map((camera_id) => camera_id.toString()).includes(doc._id.toString())
		);
		models = models.filter((model) => model_cameras.some((m2c) => m2c.model_id.toString() === model.id));
		// delete all children Schedules
		model_cameras.forEach((model_camera) =>
			Schedule.deleteMany({ model_camera_id: model_camera._id }).exec()
		);
		// re-balance affected models
		models.forEach((model) => (process.load[model.category][model.name] -= 1));
		// delete all children model_cameras
		await ModelToCamera.deleteMany(
			{
				camera_id: doc._id
			},
			{ returnDocument: 'before' }
		).exec();
		// delete camera access of each user
		for (const user of users) {
			const oldCA = user.camera_access;
			user.camera_access = oldCA?.filter((camera_id) => camera_id.toString() != doc._id.toString());
			await user.save();
		}
		// delete camera whitelist of each personnel
		for (const person of personnel) {
			const oldCW = person.camera_whitelist;
			person.camera_whitelist = oldCW?.filter((camera_id) => camera_id.toString() != doc._id.toString());
			await person.save();
		}
	}
);

// Compile model from schema
const Camera = mongoose.model('Camera', CameraSchema);
export default Camera;
