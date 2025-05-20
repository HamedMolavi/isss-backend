import mongoose, { Schema } from 'mongoose';
import { ILogType } from '../../../types/interfaces/logType.interface';

import { LOG_TYPE_KEYS } from '../../../types/enums/logType.enum';

/**
 * Schema for LogType collection
 */
const LogTypeSchema: Schema<ILogType> = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			unique: true,
			index: true,
			trim: true,
			validate: {
				validator: (v: string) => v.length >= 3,
				message: (props) => `${props.value} is too short (minimum is 3 characters)`
			}
		},
		system: { type: Boolean, default: false },
		isActive: { type: Boolean, default: true },
		ts: { type: Number, default: Date.now }, // Timestamp field to track last modification
		[LOG_TYPE_KEYS.username]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.userid]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.success]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.ip]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.userAgent]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.action]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.method]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.url]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.duration]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.details]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.headers]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.timestamp]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.model]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.recordId]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.component]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.operation]: { type: Boolean, default: true },
		[LOG_TYPE_KEYS.license]: { type: Boolean, default: true }
	},
	{
		collection: 'LogType',
		timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
	}
);

// Add compound index for isActive and ts
LogTypeSchema.index({ isActive: 1, ts: -1 });

// Pre-save hook to ensure only one active LogType
LogTypeSchema.pre('save', async function (next) {
	if (this.isActive) {
		// Deactivate all other LogTypes
		await mongoose
			.model('LogType')
			.updateMany({ _id: { $ne: this._id }, isActive: true }, { $set: { isActive: false } });
	}
	next();
});

// Pre-delete hook to prevent deleting active LogType
LogTypeSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
	if (this.isActive) {
		throw new Error('Cannot delete active LogType');
	}
	next();
});

// Pre-update hook to ensure only one active LogType
LogTypeSchema.pre(['updateOne', 'findOneAndUpdate'], async function (next) {
	const update = this.getUpdate() as { $set?: { isActive?: boolean } };
	const docToUpdate = await this.model.findOne(this.getQuery());

	if (update?.$set?.isActive === true) {
		// Deactivate all other LogTypes
		await mongoose
			.model('LogType')
			.updateMany({ _id: { $ne: docToUpdate._id }, isActive: true }, { $set: { isActive: false } });
	}
	next();
});

// Create the model
export const LogType = mongoose.model('LogType', LogTypeSchema);

export const DEFAULT_LOG_TYPE: ILogType = {
	name: 'default',
	system: true,
	isActive: true,
	ts: Date.now(),
	username: true,
	userid: true,
	success: true,
	ip: true,
	userAgent: true,
	action: true,
	method: true,
	url: true,
	duration: true,
	details: true,
	headers: true,
	timestamp: true,
	model: true,
	recordId: true,
	component: true,
	operation: true,
	license: true
};
