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
		MIN_LENGTH: 8,
		REQUIREMENTS: [
			{ re: /.{8,}/, label: 'At least 8 characters' },
			{ re: /[0-9]/, label: 'Includes number' },
			{ re: /[a-z]/, label: 'Includes lowercase letter' },
			{ re: /[A-Z]/, label: 'Includes uppercase letter' },
			{ re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' }
		]
	},
	// Log backup configuration
	LOG_BACKUP: {
		CHECK_INTERVAL_HOURS: 1, // Default to 1 hour (check more frequently)
		CHECK_INTERVAL_MS: 60 * 60 * 1000, // 1 hour in milliseconds
		TTL_DAYS: 60, // Default retention period for logs
		BACKUP_INTERVAL_DAYS: 30, // Default backup interval
		MAX_SIZE_BYTES: 1024 * 1024 * 1024, // 1GB default
		MAX_LOG_COUNT: 1000000, // 1 million logs default
		WARNING_THRESHOLD: 0.8, // 80% warning threshold
		AUTO_BACKUP: true,
		AUTO_CLEANUP: false,
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
			// Authentication cookies must never be transmitted over plain HTTP.
			SECURE: true,
			SAME_SITE: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax', // Strict in production
			PATH: '/'
		}
	},

	// Resource creation rate limiting (prevents race condition attacks)
	RESOURCE_RATE_LIMIT: {
		USER: {
			WINDOW_MS: 60 * 1000, // 1 minute
			MAX_REQUESTS: 5, // 5 users per minute
			KEY_PREFIX: 'rate_limit:user_create:'
		},
		CAMERA: {
			WINDOW_MS: 60 * 1000, // 1 minute
			MAX_REQUESTS: 10, // 10 cameras per minute
			KEY_PREFIX: 'rate_limit:camera_create:'
		},
		PERSONNEL: {
			WINDOW_MS: 60 * 1000, // 1 minute
			MAX_REQUESTS: 20, // 20 personnel per minute
			KEY_PREFIX: 'rate_limit:personnel_create:'
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

		// Get password min length from database (ensure minimum 8)
		const passwordMinLength = Math.max(
			dbConfig.passwordMinLength || defaultConfig.PASSWORD.MIN_LENGTH,
			8
		);

		// Convert database regex strings back to RegExp objects for password requirements
		let passwordRequirements =
			dbConfig.passwordRequirements?.map((requirement) => {
				// Handle regex strings that may be stored with /.../ delimiters
				let regexStr = requirement.re;
				if (regexStr.startsWith('/') && regexStr.lastIndexOf('/') > 0) {
					// Extract the pattern between the first and last /
					const lastSlashIndex = regexStr.lastIndexOf('/');
					regexStr = regexStr.slice(1, lastSlashIndex);
				}
				return {
					re: new RegExp(regexStr),
					label: requirement.label
				};
			}) || defaultConfig.PASSWORD.REQUIREMENTS;

		// Update or add length requirement based on passwordMinLength
		const lengthRequirementIndex = passwordRequirements.findIndex((req) =>
			req.re.source.includes('.{') && req.label.toLowerCase().includes('character')
		);

		const lengthRequirement = {
			re: new RegExp(`.{${passwordMinLength},}`),
			label: `At least ${passwordMinLength} characters`
		};

		if (lengthRequirementIndex >= 0) {
			passwordRequirements[lengthRequirementIndex] = lengthRequirement;
		} else {
			passwordRequirements = [lengthRequirement, ...passwordRequirements];
		}

		return {
			...defaultConfig,
			MAX_CONCURRENT_SESSIONS: dbConfig.maxConcurrentSessions || defaultConfig.MAX_CONCURRENT_SESSIONS,
			PASSWORD: {
				MIN_LENGTH: passwordMinLength,
				REQUIREMENTS: passwordRequirements
			},
			LOG_BACKUP: {
				CHECK_INTERVAL_HOURS:
					dbConfig.logBackup?.checkIntervalHours || defaultConfig.LOG_BACKUP.CHECK_INTERVAL_HOURS,
				CHECK_INTERVAL_MS: dbConfig.logBackup?.checkIntervalMs || defaultConfig.LOG_BACKUP.CHECK_INTERVAL_MS,
				TTL_DAYS: dbConfig.logBackup?.ttlDays || defaultConfig.LOG_BACKUP.TTL_DAYS,
				BACKUP_INTERVAL_DAYS:
					dbConfig.logBackup?.backupIntervalDays || defaultConfig.LOG_BACKUP.BACKUP_INTERVAL_DAYS,
				MAX_SIZE_BYTES: dbConfig.logBackup?.maxSizeBytes || defaultConfig.LOG_BACKUP.MAX_SIZE_BYTES,
				MAX_LOG_COUNT: dbConfig.logBackup?.maxLogCount || defaultConfig.LOG_BACKUP.MAX_LOG_COUNT,
				WARNING_THRESHOLD: dbConfig.logBackup?.warningThreshold || defaultConfig.LOG_BACKUP.WARNING_THRESHOLD,
				AUTO_BACKUP:
					dbConfig.logBackup?.autoBackup !== undefined
						? dbConfig.logBackup.autoBackup
						: defaultConfig.LOG_BACKUP.AUTO_BACKUP,
				AUTO_CLEANUP:
					dbConfig.logBackup?.autoCleanup !== undefined
						? dbConfig.logBackup.autoCleanup
						: defaultConfig.LOG_BACKUP.AUTO_CLEANUP,
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

// Function to refresh security config (called after config updates)
async function refreshSecurityConfig(): Promise<void> {
	try {
		const config = await getSecurityConfig();
		SecurityConfigDefault = config;
		console.log('Security configuration refreshed from database');
	} catch (error) {
		console.error('Failed to refresh security config from database:', error);
	}
}

// Function to get current session timeout in seconds (for Redis store)
function getSessionTimeoutSeconds(): number {
	return Math.floor(SecurityConfigDefault.SESSION.TIMEOUT / 1000);
}

// Export the configuration and initialization function
export {
	SecurityConfigDefault,
	initializeSecurityConfig,
	getSecurityConfig,
	refreshSecurityConfig,
	getSessionTimeoutSeconds
};
