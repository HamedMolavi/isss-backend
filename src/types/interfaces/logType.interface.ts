import { LOG_TYPE_KEYS } from '../enums/logType.enum';

export interface ILogType {
	[LOG_TYPE_KEYS.username]: boolean;
	[LOG_TYPE_KEYS.userid]: boolean;
	[LOG_TYPE_KEYS.success]: boolean;
	[LOG_TYPE_KEYS.ip]: boolean;
	[LOG_TYPE_KEYS.userAgent]: boolean;
	[LOG_TYPE_KEYS.action]: boolean;
	[LOG_TYPE_KEYS.method]: boolean;
	[LOG_TYPE_KEYS.url]: boolean;
	[LOG_TYPE_KEYS.duration]: boolean;
	[LOG_TYPE_KEYS.details]: boolean;
	[LOG_TYPE_KEYS.headers]: boolean;
	[LOG_TYPE_KEYS.timestamp]: boolean;
	[LOG_TYPE_KEYS.model]: boolean;
	[LOG_TYPE_KEYS.recordId]: boolean;
	[LOG_TYPE_KEYS.component]: boolean;
	[LOG_TYPE_KEYS.operation]: boolean;
	[LOG_TYPE_KEYS.license]: boolean;
	[LOG_TYPE_KEYS.successEvents]: boolean;
	ts: number;
	name: string;
	system: boolean;
	isActive: boolean;
}
