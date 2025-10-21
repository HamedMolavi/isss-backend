import { SecurityConfig } from '../db/mongo/models/securityConfig';

// Default configuration values
const defaultConfig = {
	// Rate limiting
	RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
	RATE_LIMIT_MAX: 100, // requests per window
	AUTH_RATE_LIMIT_MAX: 5, // auth requests per window

	// MongoDB sanitization
	MONGO_SANITIZE_REPLACE: '_',

	// HSTS
	HSTS_MAX_AGE: 31536000, // 1 year

	// Maximum concurrent sessions per user
	MAX_CONCURRENT_SESSIONS: 5,
	// Password requirements configuration
	PASSWORD: {
		REQUIREMENTS: [
			{ re: /[0-9]/, label: 'Includes number' },
			{ re: /[a-z]/, label: 'Includes lowercase letter' },
			{ re: /[A-Z]/, label: 'Includes uppercase letter' },
			{ re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' }
		]
	},
	// Log backup configuration
	LOG_BACKUP: {
		CHECK_INTERVAL_HOURS: 24, // Default to 24 hours
		CHECK_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
		TTL_DAYS: 60, // Default retention period for logs
		DEFAULT_CONFIG: {
			TTL_DAYS: 60,
			IS_AUTO_BACKUP: true
		}
	},

	// Login rate limiting
	LOGIN_RATE_LIMIT: {
		MAX_ATTEMPTS: 5,
		BLOCK_DURATION_MINUTES: 30,
		WINDOW_MINUTES: 15,
		HISTORY_RETENTION_DAYS: 7,
		REDIS_PREFIX: 'login_attempts:',
		ATTEMPTS_HISTORY_PREFIX: 'login_history:'
	},

	// Session configuration
	SESSION: {
		TIMEOUT: 30 * 60 * 1000, // 30 minutes
		NAME: 'Bearer',
		COOKIE: {
			HTTP_ONLY: true,
			SECURE: process.env.NODE_ENV === 'production',
			SAME_SITE: 'lax' as const,
			PATH: '/'
		}
	}
};

// Function to get security config from database or use defaults
async function getSecurityConfig() {
	try {
		const dbConfig = await SecurityConfig.findOne().lean();

		if (!dbConfig) {
			return defaultConfig;
		}

		// Convert database regex strings back to RegExp objects for password requirements
		const passwordRequirements =
			dbConfig.passwordRequirements?.map((requirement) => ({
				re: new RegExp(requirement.re),
				label: requirement.label
			})) || defaultConfig.PASSWORD.REQUIREMENTS;

		return {
			...defaultConfig,
			MAX_CONCURRENT_SESSIONS: dbConfig.maxConcurrentSessions || defaultConfig.MAX_CONCURRENT_SESSIONS,
			PASSWORD: {
				REQUIREMENTS: passwordRequirements
			},
			LOG_BACKUP: {
				CHECK_INTERVAL_HOURS:
					dbConfig.logBackup?.checkIntervalHours || defaultConfig.LOG_BACKUP.CHECK_INTERVAL_HOURS,
				CHECK_INTERVAL_MS: dbConfig.logBackup?.checkIntervalMs || defaultConfig.LOG_BACKUP.CHECK_INTERVAL_MS,
				TTL_DAYS: dbConfig.logBackup?.ttlDays || defaultConfig.LOG_BACKUP.TTL_DAYS,
				DEFAULT_CONFIG: {
					TTL_DAYS:
						dbConfig.logBackup?.defaultConfig?.ttlDays || defaultConfig.LOG_BACKUP.DEFAULT_CONFIG.TTL_DAYS,
					IS_AUTO_BACKUP:
						dbConfig.logBackup?.defaultConfig?.isAutoBackup !== undefined
							? dbConfig.logBackup.defaultConfig.isAutoBackup
							: defaultConfig.LOG_BACKUP.DEFAULT_CONFIG.IS_AUTO_BACKUP
				}
			},
			LOGIN_RATE_LIMIT: {
				MAX_ATTEMPTS: dbConfig.loginRateLimit?.maxAttempts || defaultConfig.LOGIN_RATE_LIMIT.MAX_ATTEMPTS,
				BLOCK_DURATION_MINUTES:
					dbConfig.loginRateLimit?.blockDurationMinutes ||
					defaultConfig.LOGIN_RATE_LIMIT.BLOCK_DURATION_MINUTES,
				WINDOW_MINUTES:
					dbConfig.loginRateLimit?.windowMinutes || defaultConfig.LOGIN_RATE_LIMIT.WINDOW_MINUTES,
				HISTORY_RETENTION_DAYS:
					dbConfig.loginRateLimit?.historyRetentionDays ||
					defaultConfig.LOGIN_RATE_LIMIT.HISTORY_RETENTION_DAYS,
				REDIS_PREFIX: defaultConfig.LOGIN_RATE_LIMIT.REDIS_PREFIX,
				ATTEMPTS_HISTORY_PREFIX: defaultConfig.LOGIN_RATE_LIMIT.ATTEMPTS_HISTORY_PREFIX
			},
			SESSION: {
				TIMEOUT: dbConfig.session?.timeout || defaultConfig.SESSION.TIMEOUT,
				NAME: defaultConfig.SESSION.NAME,
				COOKIE: defaultConfig.SESSION.COOKIE
			}
		};
	} catch (error) {
		console.error('Error fetching security config from database, using defaults:', error);
		return defaultConfig;
	}
}

// Initialize the configuration with defaults
let SecurityConfigDefault = defaultConfig;

// Function to initialize security config from database (called after DB connection)
async function initializeSecurityConfig(): Promise<void> {
	try {
		const config = await getSecurityConfig();
		SecurityConfigDefault = config;
		console.log('Security configuration loaded from database');
	} catch (error) {
		console.error('Failed to initialize security config from database, using defaults:', error);
		SecurityConfigDefault = defaultConfig;
	}
}

// Export the configuration and initialization function
export { SecurityConfigDefault, initializeSecurityConfig, getSecurityConfig };
