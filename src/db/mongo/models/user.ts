import mongoose, { Schema } from 'mongoose';
import { compareSync } from 'bcrypt';
import { randomBytes, pbkdf2Sync } from 'crypto';
import { IUserDocument, IUserModel } from '../../../types/interfaces/user.interface';
import { getEntries, setNestedObjectValue } from '../../../tools/utils.tools';
import { JSON_hash } from '../../../tools/utils.tools';
import { SQLite } from '../../sqlite';
import { CallbackError } from 'mongoose';

// SHA-256 password hashing configuration
const SHA256_ITERATIONS = 100000;
const SHA256_KEYLEN = 64;
const SHA256_DIGEST = 'sha256';
const SALT_LENGTH = 32;

/**
 * Hash password using SHA-256 with PBKDF2 key derivation
 * Format: salt:hash (both hex encoded)
 */
function hashPasswordSHA256(password: string, username: string): string {
	const salt = randomBytes(SALT_LENGTH).toString('hex');
	const combined = password + username;
	const hash = pbkdf2Sync(combined, salt, SHA256_ITERATIONS, SHA256_KEYLEN, SHA256_DIGEST).toString('hex');
	return `${salt}:${hash}`;
}

/**
 * Verify password against SHA-256 hash
 */
function verifyPasswordSHA256(password: string, username: string, storedHash: string): boolean {
	const [salt, hash] = storedHash.split(':');
	if (!salt || !hash) return false;
	const combined = password + username;
	const verifyHash = pbkdf2Sync(combined, salt, SHA256_ITERATIONS, SHA256_KEYLEN, SHA256_DIGEST).toString(
		'hex'
	);
	return hash === verifyHash;
}

//create user model with schema for save in DB
const UserSchema: Schema<IUserDocument> = new Schema(
	{
		username: { type: String, required: true },
		password: { type: String, required: true },
		phone_number: { type: String, required: true },
		last_login: { type: Date, default: Date.now },
		last_operation: { type: Object, default: {} },
		access_level: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessLevel', required: true },
		role: { type: String, default: 'user' },
		created_date: { type: Date, default: Date.now },
		camera_access: { type: Array<mongoose.Types.ObjectId>, ref: 'Camera', default: [] },
		is_active: { type: Boolean, default: true },
		otp_secret: { type: String, select: false },
		otp_auth_url: { type: String, select: false },
		otp_enabled: { type: Boolean, default: false },
		ip_restricted: { type: Boolean, default: false },
		allowed_ips: { type: [String], default: [] },
		must_change_password: { type: Boolean, default: false }
	},
	{
		collection: 'User',
		toJSON: {
			transform(_doc, ret) {
				delete ret['password'];
				delete ret['otp_secret'];
				delete ret['otp_auth_url'];
				return ret;
			}
		}
	}
);

/**
 * Check if stored hash is SHA-256 format (salt:hash)
 */
function isSHA256Hash(storedHash: string): boolean {
	// SHA-256 format: 64-char salt + ':' + 128-char hash
	const parts = storedHash.split(':');
	return parts.length === 2 && parts[0].length === 64 && parts[1].length === 128;
}

/**
 * Compare password - supports both bcrypt (legacy) and SHA-256 (new)
 * For backward compatibility with existing bcrypt passwords
 * Detects hash format automatically based on stored hash structure
 */
UserSchema.methods.checkPassword = function (password: string): boolean {
	// Detect hash format: SHA-256 uses 'salt:hash' format
	if (isSHA256Hash(this.password)) {
		return verifyPasswordSHA256(password, this.username, this.password);
	}

	// Legacy bcrypt verification
	return compareSync(password + this.username, this.password);
};

/**
 * Set password using SHA-256 with PBKDF2
 */
UserSchema.methods.setPassword = function (password: string, username: string): string {
	return hashPasswordSHA256(password, username);
};

// Pre-save hook to hash password using SHA-256
UserSchema.pre('save', function (done: (err?: CallbackError) => void) {
	try {
		if (!this.isModified('password')) return done();
		this.password = this.setPassword(this.password, this.username);
		done();
	} catch (err) {
		done(err as CallbackError);
	}
});

// Pre-save hook to generate and store username hash for integrity checking
UserSchema.pre('save', async function (next) {
	try {
		// Only generate hash for username integrity on initial save or username changes
		if (this.isNew || this.isModified('username')) {
			// Ensure we have an _id (for new documents)
			if (!this._id) {
				this._id = new mongoose.Types.ObjectId();
			}

			// Create a normalized object with username data for integrity checking
			const usernameData = {
				_id: this._id.toString(),
				username: this.username,
				created_date: this.created_date
			};

			const hashedDoc = JSON_hash(usernameData);
			if (!hashedDoc) {
				return next(new Error('Failed to generate hash for username integrity'));
			}

			// Store hash in SQLite UserHash table
			await SQLite.insert('UserHash', { _id: this._id.toString(), hash: hashedDoc.hash });
		}

		next();
	} catch (error) {
		console.error('Error in user pre-save hook for integrity:', error);
		return next(error as CallbackError);
	}
});

UserSchema.pre('updateOne', async function (done) {
	try {
		const doc = await this.model.findOne(this.getQuery());
		if (!doc) {
			return done(new Error('User not found'));
		}

		const updatingFields: { [key: string]: string } = Object(this.getUpdate());

		// Handle password updates - hash with SHA-256
		if (getEntries(updatingFields).some(([path]) => path.includes('password'))) {
			const [passwordPath, rawPassword] = getEntries(updatingFields).find(([path]) =>
				path.includes('password')
			) ?? ['', ''];

			if (passwordPath && rawPassword) {
				const password = doc.setPassword(rawPassword as string, doc.username);
				setNestedObjectValue(updatingFields, passwordPath.split('.'), password);
				this.setUpdate(updatingFields);
			}
		}

		// Handle username updates - regenerate integrity hash
		if (getEntries(updatingFields).some(([path]) => path.includes('username'))) {
			const [usernamePath, newUsername] = getEntries(updatingFields).find(([path]) =>
				path.includes('username')
			) ?? ['', ''];

			if (usernamePath && newUsername) {
				// Create new hash with updated username
				const usernameData = {
					_id: doc._id.toString(),
					username: newUsername,
					created_date: doc.created_date
				};

				const hashedDoc = JSON_hash(usernameData);
				if (!hashedDoc) {
					return done(new Error('Failed to generate hash for username integrity'));
				}

				// Update hash in SQLite UserHash table
				await SQLite.insert('UserHash', { _id: doc._id.toString(), hash: hashedDoc.hash });
			}
		}

		done();
	} catch (error) {
		console.error('Error in user pre-updateOne hook:', error);
		return done(error as CallbackError);
	}
});

// Static method to verify username integrity
UserSchema.statics.verifyUsernameIntegrity = async function (userId: string): Promise<boolean> {
	try {
		// Get the user from MongoDB
		const user = await this.findById(userId).lean();
		if (!user) {
			return false;
		}

		// Get stored hash from SQLite
		return new Promise((resolve) => {
			SQLite.runQuery<{ hash: string }>(
				`SELECT hash FROM UserHash WHERE _id = ?`,
				[userId],
				async function (err: Error | null, rows: Array<{ hash: string }>) {
					if (err || !rows || !rows.length) {
						// Create a normalized object with the same structure as during save
						const usernameData = {
							_id: userId,
							username: user.username,
							created_date: user.created_date
						};

						// Calculate new hash from normalized document
						const hashedDoc = JSON_hash(usernameData);
						const calculatedHash = hashedDoc?.hash;

						if (calculatedHash) {
							// Insert the hash into SQLite
							SQLite.runQuery(
								`INSERT INTO UserHash (_id, hash) VALUES (?, ?)`,
								[userId, calculatedHash],
								function (insertErr: Error | null) {
									if (insertErr) {
										console.error('Failed to insert hash into SQLite:', insertErr);
										return resolve(false);
									}
									console.log('Successfully created hash for user in SQLite:', userId);
									resolve(true);
								}
							);
						} else {
							console.error('Failed to calculate hash for user:', userId);
							resolve(false);
						}
						return;
					}

					// Create a normalized object with the same structure as during save
					const usernameData = {
						_id: userId,
						username: user.username,
						created_date: user.created_date
					};

					// Calculate new hash from normalized document
					const storedHash = rows[0].hash;
					const hashedDoc = JSON_hash(usernameData);
					const calculatedHash = hashedDoc?.hash;

					resolve(storedHash === calculatedHash);
				}
			);
		});
	} catch (error) {
		console.error('Error verifying username integrity:', error);
		return false;
	}
};

// Static method to find user with OTP secret included
UserSchema.statics.findByIdWithOTP = function (userId: string) {
	return this.findById(userId).select('+otp_secret +otp_auth_url');
};

// Compile model from schema
const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);
export default User;
