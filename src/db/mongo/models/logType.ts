import mongoose, { Schema } from 'mongoose';
import { ILogType } from '../../../types/interfaces/logType.interface';
import { MongooseTransport } from '../../../logger/transports';

/**
 * Default log type configuration
 */
export const DEFAULT_LOG_TYPE: ILogType = {
	name: 'default',
	system: true,
	ts: 0,
	method: true,
	user: true,
	ip: true,
	result: true,
	url: true,
	userAgent: true,
	body: true,
	query: true,
	params: true
};

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
		ts: { type: Number, default: Date.now, index: true },
		method: { type: Boolean, default: true },
		user: { type: Boolean, default: true },
		ip: { type: Boolean, default: true },
		result: { type: Boolean, default: true }
	},
	{
		collection: 'LogType',
		timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
	}
);

// Ensure ts field is updated on modifications
LogTypeSchema.pre('save', function (next) {
	if (this.isNew || this.isModified()) {
		this.ts = Date.now();
	}
	next();
});

// Post-save hook with improved error handling
LogTypeSchema.post('save', function (doc, next) {
	try {
		// Update MongooseTransport with the latest log type
		if (!MongooseTransport.logType || MongooseTransport.logType.ts < doc.ts) {
			MongooseTransport.logType = doc.toJSON();
		}
		next();
	} catch (error) {
		console.error('Error in LogType post-save hook:', error);
		next(error instanceof Error ? error : new Error(String(error)));
	}
});

// Post-remove hook with improved error handling
LogTypeSchema.post('remove', function (doc, next) {
	try {
		// Reset to default if the current log type was deleted
		if (MongooseTransport.logType && MongooseTransport.logType.ts === doc.ts) {
			// Find the next most recent log type or use default
			LogType.findOne({})
				.sort({ ts: -1 })
				.then((latestLogType) => {
					MongooseTransport.logType = latestLogType?.toJSON() || DEFAULT_LOG_TYPE;
				})
				.catch((err) => console.error('Error finding latest log type:', err));
		}
		next();
	} catch (error) {
		console.error('Error in LogType post-remove hook:', error);
		next(error instanceof Error ? error : new Error(String(error)));
	}
});

// Create the model
export const LogType = mongoose.model('LogType', LogTypeSchema);

// Initialize with default log type if none exists
LogType.countDocuments()
	.then((count) => {
		if (count === 0) {
			console.log('Initializing default log type configuration');
			return LogType.create({
				...DEFAULT_LOG_TYPE,
				ts: Date.now()
			});
		}
	})
	.catch((err) => console.error('Error checking for default log type:', err));
