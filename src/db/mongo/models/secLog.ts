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
		hash: { type: String },
		meta: { type: Object, default: {} }
	},
	{
		minimize: false,
		collection: 'Log',
		capped: parseInt(process.env['LOG_COLLECTION_SIZE'] ?? '512'),
		timestamps: { createdAt: true, updatedAt: true },
		writeConcern: { j: false }
	}
);

// Compound index for common query patterns
LogSchema.index({ timestamp: -1, level: 1 });
LogSchema.index({ 'meta.type': 1, timestamp: -1 });
LogSchema.index({ 'meta.userId': 1, timestamp: -1 });

// Move hash generation to pre-validate
LogSchema.pre('validate', function (next) {
	try {
		const hashedDoc = JSON_hash(this.toObject());
		if (!hashedDoc) {
			return next(new Error('Failed to generate hash for document'));
		}
		this.hash = hashedDoc.hash;
		next();
	} catch (error) {
		console.error('Error generating hash in pre-validate hook:', error);
		return next(error as CallbackError);
	}
});

// Post-save hook with better error handling
LogSchema.post('save', async function (doc, next) {
	try {
		if (doc?.id && doc?.hash) {
			try {
				await SQLite.insert('Hash', { _id: doc.id, hash: doc.hash });
			} catch (err: unknown) {
				console.error('Failed to insert hash into SQLite:', err);
			}
		}
		next();
	} catch (error) {
		console.error('Error in post-save hook:', error);
		return next(error as CallbackError);
	}
});

// Static method to verify log integrity
LogSchema.statics.verifyIntegrity = async function (logId: string): Promise<boolean> {
	try {
		// Get the log from MongoDB
		const log = await this.findById(logId).lean();
		if (!log) {
			return false;
		}

		// Get the stored hash from SQLite
		return new Promise((resolve) => {
			SQLite.runQuery<{ hash: string }>(`SELECT hash FROM Hash WHERE _id = '${logId}'`, (err, rows) => {
				if (err || !rows || !rows.length) {
					console.error('Hash verification failed:', err || 'No hash found');
					return resolve(false);
				}

				// Recalculate hash and compare
				const storedHash = rows[0].hash;
				const hashedDoc = JSON_hash(log);
				const calculatedHash = hashedDoc?.hash;

				resolve(storedHash === calculatedHash);
			});
		});
	} catch (error) {
		console.error('Error verifying log integrity:', error);
		return false;
	}
};

export const Log = mongoose.model('Log', LogSchema);
