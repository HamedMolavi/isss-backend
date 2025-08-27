import mongoose, { Schema } from 'mongoose';
import { IAccessLevel, accessList } from '../../../types/interfaces/accessLevel.interface';
import { authHexToObject } from '../../../tools/utils.tools';
import User from './user';

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
		logs: { type: Number, default: 4, min: 0, max: 15 },
		system: { type: Number, default: 0, min: 0, max: 15 },
		report: { type: Number, default: 0, min: 0, max: 15 },
		product: { type: Number, default: 0, min: 0, max: 15 },
		dataImportExport: { type: Number, default: 0, min: 0, max: 15 }
	},
	{
		collection: 'AccessLevel'
	}
);

AccessLevelSchema.post(
	['remove', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove'],
	async (doc) => {
		const defaultAccessLevelId = (await AccessLevel.findOne({ name: 'default' }))?._id;
		await User.updateMany(
			{
				access_level: doc._id
			},
			{ $set: { access_level: defaultAccessLevelId } },
			{ returnDocument: 'after' }
		).exec();
	}
);

AccessLevelSchema.methods.toJSON = function () {
	const result: Record<string, unknown> = {};
	for (const access of accessList) result[access] = authHexToObject(this[access]);
	return {
		_id: this.id,
		name: this.name,
		...result
	};
};

const AccessLevel = mongoose.model('AccessLevel', AccessLevelSchema);
export default AccessLevel;
