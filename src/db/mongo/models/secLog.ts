import mongoose, { Schema } from 'mongoose';
import { ILog } from '../../../types/interfaces/secLog.interface';
import { JSON_hash } from '../../../tools/utils.tools';
import { SQLite } from '../../sqlite';
import { CallbackError } from 'mongoose';

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
		metadata: { type: Object, default: {} }
	},
	{
		minimize: false,
		collection: 'Log',
		timestamps: { createdAt: true, updatedAt: true },
		writeConcern: { j: false }
	}
);

// Compound index for common query patterns
LogSchema.index({ timestamp: -1, level: 1 });
LogSchema.index({ 'meta.type': 1, timestamp: -1 });
LogSchema.index({ 'meta.userId': 1, timestamp: -1 });

// Pre-save hook to generate and store hash
LogSchema.pre('save', async function (next) {
	try {
		const hashedDoc = JSON_hash(this.toObject());
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
				function (err: Error | null, rows: Array<{ hash: string }>) {
					if (err || !rows || !rows.length) {
						console.error('Hash verification failed:', err || 'No hash found');
						return resolve(false);
					}

					// Calculate new hash from current document
					const storedHash = rows[0].hash;
					const hashedDoc = JSON_hash(log);
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

export const Log = mongoose.model('Log', LogSchema);
