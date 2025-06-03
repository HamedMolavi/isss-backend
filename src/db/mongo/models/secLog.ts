import mongoose, { Schema, Model } from 'mongoose';
import { ILog } from '../../../types/interfaces/secLog.interface';
import { JSON_hash } from '../../../tools/utils.tools';
import { SQLite } from '../../sqlite';
import { CallbackError } from 'mongoose';

// Interface for static methods
interface ILogModel extends Model<ILog> {
	verifyIntegrity(logId: string): Promise<boolean>;
}

// Valid log levels for validation
const LOG_LEVELS = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];

const LogSchema: Schema<ILog> = new Schema(
	{
		level: {
			type: String,
			required: true,
			index: true,
			validate: {
				validator: (val: string) => LOG_LEVELS.includes(val),
				message: (props) => `${props.value} is not a valid log level`
			}
		},
		timestamp: { type: Date, default: Date.now },
		message: { type: String, required: true },
		action: { type: String, required: true, index: true },
		metadata: { type: Object, default: {} },
		expires_at: {
			type: Date,
			default: () => {
				const ttlDays = process.env.LOG_TTL_DAYS ? parseInt(process.env.LOG_TTL_DAYS) : 30;
				return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
			}
		}
	},
	{
		minimize: false,
		collection: 'Log',
		timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
		writeConcern: { j: false }
	}
);

// Compound index for common query patterns
LogSchema.index({ timestamp: -1, level: 1 });
LogSchema.index({ action: 1, timestamp: -1 });
LogSchema.index({ 'metadata.type': 1, timestamp: -1 });
LogSchema.index({ 'metadata.userId': 1, timestamp: -1 });
LogSchema.index({ message: 1 }); // Add index for message field

LogSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to generate and store hash
LogSchema.pre('save', async function (next) {
	try {
		// Ensure we have an _id (for new documents)
		if (!this._id) {
			this._id = new mongoose.Types.ObjectId();
		}

		// Create a normalized object with only the essential log fields
		const logData = {
			_id: this._id.toString(), // Include _id for consistency
			level: this.level,
			timestamp: this.timestamp,
			message: this.message,
			action: this.action,
			metadata: this.metadata,
			expires_at: this.expires_at
		};

		const hashedDoc = JSON_hash(logData);
		if (!hashedDoc) {
			return next(new Error('Failed to generate hash for document'));
		}

		// Store hash in SQLite
		await SQLite.insert('Hash', { _id: this._id.toString(), hash: hashedDoc.hash });

		next();
	} catch (error) {
		console.error('Error in pre-save hook:', error);
		return next(error as CallbackError);
	}
});

// Static method to verify log integrity
LogSchema.statics.verifyIntegrity = async function (logId: string): Promise<boolean> {
	try {
		// Get the log from MongoDB without hash field
		const log = await this.findById(logId).lean();
		if (!log) {
			return false;
		}

		// Get stored hash from SQLite
		return new Promise((resolve) => {
			SQLite.runQuery<{ hash: string }>(
				`SELECT hash FROM Hash WHERE _id = ?`,
				[logId],
				function (err: Error | null, rows: Array<{ hash: string }>) {
					if (err || !rows || !rows.length) {
						console.error('Hash verification failed:', err || 'No hash found for log:', logId);
						return resolve(false);
					}

					// Create a normalized object with the same structure as during save
					const logData = {
						_id: logId, // Include _id for consistency
						level: log.level,
						timestamp: log.timestamp,
						message: log.message,
						action: log.action,
						metadata: log.metadata,
						expires_at: log.expires_at
					};

					// Calculate new hash from normalized document
					const storedHash = rows[0].hash;
					const hashedDoc = JSON_hash(logData);
					const calculatedHash = hashedDoc?.hash;

					resolve(storedHash === calculatedHash);
				}
			);
		});
	} catch (error) {
		console.error('Error verifying log integrity:', error);
		return false;
	}
};

export const Log = mongoose.model<ILog, ILogModel>('Log', LogSchema);
