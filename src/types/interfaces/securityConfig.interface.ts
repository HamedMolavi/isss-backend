import { Document } from 'mongoose';

export interface ISecurityConfig extends Document {
	maxConcurrentSessions: number;
	passwordMinLength: number;
	passwordRequirements: Array<{
		re: string;
		label: string;
	}>;
	logBackup: {
		checkIntervalHours: number;
		checkIntervalMs: number;
		ttlDays: number;
		backupIntervalDays: number;
		maxSizeBytes: number;
		maxLogCount: number;
		warningThreshold: number;
		autoBackup: boolean;
		autoCleanup: boolean;
		defaultConfig: {
			ttlDays: number;
			isAutoBackup: boolean;
		};
	};
	loginRateLimit: {
		maxAttempts: number;
		blockDurationMinutes: number;
		windowMinutes: number;
		historyRetentionDays: number;
		redisPrefix: string;
		attemptsHistoryPrefix: string;
	};
	session: {
		timeout: number;
	};
	created_at: Date;
	updated_at: Date;
}
