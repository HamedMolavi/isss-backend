import { SecurityConfig } from '../models/securityConfig';
import { SecurityConfigDefault as SecurityConfigValues } from '../../../config/security.config';

export const seedSecurityConfig = async () => {
	try {
		// Check if configuration already exists
		const existingConfig = await SecurityConfig.findOne();
		if (existingConfig) {
			console.log('Security configuration already exists, skipping seed...');
			return;
		}

		// Create new security configuration
		const securityConfig = new SecurityConfig({
			maxConcurrentSessions: SecurityConfigValues.MAX_CONCURRENT_SESSIONS,
			passwordRequirements: SecurityConfigValues.PASSWORD.REQUIREMENTS.map((req) => ({
				re: req.re.source, // Use .source to get the regex pattern without delimiters
				label: req.label
			})),
			logBackup: {
				checkIntervalHours: SecurityConfigValues.LOG_BACKUP.CHECK_INTERVAL_HOURS,
				checkIntervalMs: SecurityConfigValues.LOG_BACKUP.CHECK_INTERVAL_MS,
				ttlDays: SecurityConfigValues.LOG_BACKUP.TTL_DAYS,
				backupIntervalDays: SecurityConfigValues.LOG_BACKUP.BACKUP_INTERVAL_DAYS,
				maxSizeBytes: SecurityConfigValues.LOG_BACKUP.MAX_SIZE_BYTES,
				maxLogCount: SecurityConfigValues.LOG_BACKUP.MAX_LOG_COUNT,
				warningThreshold: SecurityConfigValues.LOG_BACKUP.WARNING_THRESHOLD,
				autoBackup: SecurityConfigValues.LOG_BACKUP.AUTO_BACKUP,
				autoCleanup: SecurityConfigValues.LOG_BACKUP.AUTO_CLEANUP,
				defaultConfig: {
					ttlDays: SecurityConfigValues.LOG_BACKUP.DEFAULT_CONFIG.TTL_DAYS,
					isAutoBackup: SecurityConfigValues.LOG_BACKUP.DEFAULT_CONFIG.IS_AUTO_BACKUP
				}
			},
			loginRateLimit: {
				maxAttempts: SecurityConfigValues.LOGIN_RATE_LIMIT.MAX_ATTEMPTS,
				blockDurationMinutes: SecurityConfigValues.LOGIN_RATE_LIMIT.BLOCK_DURATION_MINUTES,
				windowMinutes: SecurityConfigValues.LOGIN_RATE_LIMIT.WINDOW_MINUTES,
				historyRetentionDays: SecurityConfigValues.LOGIN_RATE_LIMIT.HISTORY_RETENTION_DAYS
			},
			session: {
				timeout: SecurityConfigValues.SESSION.TIMEOUT
			}
		});

		await securityConfig.save();
		console.log('Security configuration seeded successfully');
	} catch (error) {
		console.error('Error seeding security configuration:', error);
		throw error;
	}
};
