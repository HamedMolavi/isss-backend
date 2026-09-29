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

export function getUserIntegritySnapshot(user: Partial<IUserDocument> & Record<string, unknown>) {
	const normalizeIds = (values: unknown): string[] =>
		Array.isArray(values) ? values.map((value) => value?.toString()).sort() : [];

	return {
		_id: user._id?.toString(),
		username: user.username,
		password: user.password,
		phone_number: user.phone_number,
		access_level: user.access_level?.toString(),
		role: user.role,
		created_date: user.created_date ? new Date(user.created_date).toISOString() : null,
		camera_access: normalizeIds(user.camera_access),
		is_active: user.is_active,
		otp_secret: user.otp_secret ?? null,
		otp_auth_url: user.otp_auth_url ?? null,
		otp_enabled: user.otp_enabled ?? false,
		ip_restricted: user.ip_restricted ?? false,
		allowed_ips: Array.isArray(user.allowed_ips) ? [...user.allowed_ips].sort() : [],
		must_change_password: user.must_change_password ?? false
	};
}

async function storeUserIntegrityHash(userId: string): Promise<void> {
	const user = await User.findById(userId).select('+otp_secret +otp_auth_url').lean();
	if (!user) return;
	const hash = JSON_hash(
		getUserIntegritySnapshot(user as Partial<IUserDocument> & Record<string, unknown>)
	)?.hash;
	if (!hash) throw new Error('Failed to generate user record integrity hash');
	await SQLite.execute('INSERT OR REPLACE INTO UserRecordHash (_id, hash) VALUES (?, ?)', [userId, hash]);
}

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

		done();
	} catch (error) {
		console.error('Error in user pre-updateOne hook:', error);
		return done(error as CallbackError);
	}
});

UserSchema.post('save', async function (doc) {
	await storeUserIntegrityHash(doc._id.toString());
});

for (const operation of ['updateOne', 'findOneAndUpdate'] as const) {
	UserSchema.post(operation, async function () {
		const updatedUser = await this.model.findOne(this.getQuery()).select('_id').lean();
		if (updatedUser?._id) await storeUserIntegrityHash(updatedUser._id.toString());
	});
}

UserSchema.post('findOneAndDelete', async function (doc) {
	if (doc?._id) {
		await SQLite.execute('DELETE FROM UserRecordHash WHERE _id = ?', [doc._id.toString()]);
	}
});

UserSchema.statics.refreshIntegrityHash = async function (userId: string): Promise<void> {
	await storeUserIntegrityHash(userId);
};

UserSchema.statics.verifyIntegrity = async function (userId: string): Promise<boolean> {
	const user = await this.findById(userId).select('+otp_secret +otp_auth_url').lean();
	if (!user) return false;
	const rows = await SQLite.queryAll<{ hash: string }>('SELECT hash FROM UserRecordHash WHERE _id = ?', [
		userId
	]);
	if (!rows.length) return false;
	const calculatedHash = JSON_hash(
		getUserIntegritySnapshot(user as Partial<IUserDocument> & Record<string, unknown>)
	)?.hash;
	return Boolean(calculatedHash && rows[0].hash === calculatedHash);
};

// Static method to verify username integrity
UserSchema.statics.verifyUsernameIntegrity = async function (userId: string): Promise<boolean> {
	return (this as IUserModel).verifyIntegrity(userId);
};

// Static method to find user with OTP secret included
UserSchema.statics.findByIdWithOTP = function (userId: string) {
	return this.findById(userId).select('+otp_secret +otp_auth_url');
};

// Compile model from schema
const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);
export default User;
