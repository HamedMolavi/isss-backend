import mongoose, { Schema } from 'mongoose';
import { ILogType } from '../../../types/interfaces/logType.interface';
import { MongooseTransport } from '../../../logger/transports';

export const DEFAULT_LOG_TYPE: ILogType = {
	name: 'default',
	system: true,
	ts: 0,
	method: true,
	user: true,
	ip: true,
	result: true
};

const LogTypeSchema: Schema<ILogType> = new mongoose.Schema(
	{
		name: { type: String, required: true },
		system: { type: Boolean, default: false },
		ts: { type: Number, default: Date.now },
		method: { type: Boolean, default: true },
		user: { type: Boolean, default: true },
		ip: { type: Boolean, default: true },
		result: { type: Boolean, default: true }
	},
	{
		collection: 'LogType'
	}
);
LogTypeSchema.post('save', function (log) {
	// if (!process.logType || process.logType.ts < log.ts) process.logType = log.toJSON();
	if (!MongooseTransport.logType || MongooseTransport.logType.ts < log.ts)
		MongooseTransport.logType = log.toJSON();
});
LogTypeSchema.post('remove', function (log) {
	// if (!!process.logType && process.logType.ts === log.ts) process.logType = log.toJSON();
	if (!!MongooseTransport.logType && MongooseTransport.logType.ts === log.ts)
		MongooseTransport.logType = log.toJSON();
});
export const LogType = mongoose.model('LogType', LogTypeSchema);
