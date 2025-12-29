import mongoose, { Document, Model } from 'mongoose';
import { Requirements } from './password.interface';
import { getSecurityConfig } from '../../config/security.config';

//create user type
export interface IUser {
	_id: mongoose.Types.ObjectId;
	username: string;
	password: string;
	phone_number: string;
	access_level: mongoose.Types.ObjectId;
	role: string;
	created_date: Date;
	camera_access?: Array<mongoose.Types.ObjectId>;
	last_login: Date;
	previous_last_login?: Date;
	last_operation: object;
	is_active: boolean;
	otp_secret?: string;
	otp_auth_url?: string;
	otp_enabled?: boolean;
	ip_restricted?: boolean;
	allowed_ips?: string[];
	must_change_password?: boolean;
}

export interface IAuthUserJSON {
	_id: mongoose.Types.ObjectId;
	username: string;
	role: string;
}

export interface IAuthSession {
	user: IAuthUserJSON;
	token: string;
}

export interface IUserDocument extends IUser, Document {
	_id: mongoose.Types.ObjectId;
	setPassword: (password: string, username: string) => string;
	checkPassword: (password: string) => Promise<boolean>;
	generateAuthSession: (is_remember: boolean) => IAuthSession;
	toAuthJSON: (is_remember: boolean) => IAuthUserJSON;
}

export interface IUserModel extends Model<IUserDocument> {
	setPassword: (password: string, username: string) => string;
	checkPassword: (password: string) => Promise<boolean>;
	generateAuthSession: (is_remember: boolean) => IAuthSession;
	toAuthJSON: (is_remember: boolean) => IAuthUserJSON;
	verifyUsernameIntegrity: (userId: string) => Promise<boolean>;
	findByIdWithOTP: (userId: string) => Promise<IUserDocument | null>;
}

// export interface PasswordRequirements extends Requirements{
//   [re: /[0-9]/,
//   label: "Includes number"]
// }

// Function to get password requirements from database configuration
export const getUserPasswordRequirements = async (): Promise<Requirements> => {
	const config = await getSecurityConfig();
	return config.PASSWORD.REQUIREMENTS;
};

// Fallback constant for compatibility (will be deprecated)
export const UserPasswordRequirements: Requirements = [
	{ re: /[0-9]/, label: 'Includes number' },
	{ re: /[a-z]/, label: 'Includes lowercase letter' },
	{ re: /[A-Z]/, label: 'Includes uppercase letter' },
	{ re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' }
];
