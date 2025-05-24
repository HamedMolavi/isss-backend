import { LOG_TYPE_KEYS } from '../enums/logType.enum';

export type ILog = {
	level: string;
	timestamp?: Date;
	message: string;
	action: string;
	metadata?: Record<string, LOG_TYPE_KEYS>;
	expires_at?: Date;
};
