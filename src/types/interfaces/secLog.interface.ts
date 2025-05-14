import { LOG_TYPE_KEYS } from '../enums/logType.enum';

export type ILog = {
	level: string;
	message: string;
	timestamp: Date;
	metadata: Partial<Record<LOG_TYPE_KEYS, boolean>>;
};
