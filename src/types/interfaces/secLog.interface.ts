export type ILog = {
	level: string;
	timestamp?: Date;
	message: string;
	action: string;
	metadata?: Record<string, unknown>;
	expires_at?: Date;
};
