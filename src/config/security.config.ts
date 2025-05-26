/**
 * Simple Security Configuration
 */

// Basic security settings
export const SecurityConfig = {
	// Rate limiting
	RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
	RATE_LIMIT_MAX: 100, // requests per window
	AUTH_RATE_LIMIT_MAX: 5, // auth requests per window

	// MongoDB sanitization
	MONGO_SANITIZE_REPLACE: '_',

	// HSTS
	HSTS_MAX_AGE: 31536000 // 1 year
};
