import mongoose, { Schema } from 'mongoose';
import { genSaltSync, compareSync, hashSync } from 'bcrypt';
import { IUserDocument, IUserModel } from '../../../types/interfaces/user.interface';
import { getEntries, setNestedObjectValue } from '../../../tools/utils.tools';
import { JSON_hash } from '../../../tools/utils.tools';
import { SQLite } from '../../sqlite';
import { CallbackError } from 'mongoose';

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
		allowed_ips: { type: [String], default: [] }
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

//compare password
UserSchema.methods.checkPassword = function (password: string) {
	return compareSync(password + this.username, this.password);
};

UserSchema.methods.setPassword = function (password: string, username: string) {
	const salt = genSaltSync(SALT_FACTOR);
	const result = hashSync(password + username, salt);
	return result;
};

//for encrypt password
const SALT_FACTOR = 10;
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
	const doc = await this.model.findOne(this.getQuery());
	const updatingFields: { [key: string]: string } = Object(this.getUpdate());

	// Handle password updates
	if (getEntries(updatingFields).some(([path]) => path.includes('password'))) {
		const [passwordPath, rawPassword] = getEntries(updatingFields).find(([path]) =>
			path.includes('password')
		) ?? ['', ''];
		const password = doc.setPassword(rawPassword, doc.username);
		if (passwordPath) setNestedObjectValue(updatingFields, passwordPath?.split('.'), password);
		this.setUpdate(updatingFields);
	}

	// Handle username updates - regenerate integrity hash
	if (getEntries(updatingFields).some(([path]) => path.includes('username'))) {
		try {
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
		} catch (error) {
			console.error('Error updating username integrity hash:', error);
			return done(error as CallbackError);
		}
	}

	done();
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
