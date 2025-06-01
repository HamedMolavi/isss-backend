import { IUserDocument } from './interfaces/user.interface';

export {};
declare module 'express-session' {
	interface SessionData {
		user: IUserDocument;
		ip: string;
		userAgent?: string;
		loginTime: Date;
		lastActivity: Date;
		userId: string;
		isRemembered: boolean;
	}
}
