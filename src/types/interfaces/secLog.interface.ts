import { LOG_TYPE_KEYS } from '../enums/logType.enum';

export type ILog = {
	level: string;
	timestamp?: Date;
	message: string; // Changed from message to action
	metadata?: Record<string, LOG_TYPE_KEYS>;
	expires_at?: Date;
};
