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

// Create the model
export const LogType = mongoose.model('LogType', LogTypeSchema);

export const DEFAULT_LOG_TYPE: ILogType = {
	name: 'default',
	system: true,
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
