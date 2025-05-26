import { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import xss from 'xss';
import { SecurityLogger } from '../logger/security.logger';

/**
 * Security Middleware Configuration
 *
 * This module provides comprehensive security middleware for the Express application:
 * - Helmet: Sets various HTTP headers for security
 * - MongoDB Sanitization: Prevents NoSQL injection attacks
 * - Rate Limiting: Prevents brute force and DDoS attacks
 * - HPP Protection: Prevents HTTP Parameter Pollution
 * - XSS Protection: Filters malicious scripts
 * - Request Slowdown: Slows down repeated requests
 */

// Rate limiting configuration
const createRateLimit = (windowMs: number, max: number, message: string, limitType: string = 'general') => {
	return rateLimit({
		windowMs,
		max,
		message: {
			success: false,
			message,
			retryAfter: Math.ceil(windowMs / 1000)
		},
		standardHeaders: true,
		legacyHeaders: false,
		// Skip successful requests
		skipSuccessfulRequests: false,
		// Skip failed requests
		skipFailedRequests: false,
		// Log rate limit violations
		handler: (req: Request, res: Response) => {
			SecurityLogger.rateLimitExceeded(req, limitType);

			res.status(429).json({
				success: false,
				message,
				retryAfter: Math.ceil(windowMs / 1000)
			});
		}
	});
};

import { SecurityConfig } from '../config/security.config';

// General rate limiting
export const generalRateLimit = createRateLimit(
	SecurityConfig.RATE_LIMIT_WINDOW,
	SecurityConfig.RATE_LIMIT_MAX,
	'Too many requests from this IP, please try again later.',
	'general'
);

// Auth rate limiting
export const authRateLimit = createRateLimit(
	SecurityConfig.RATE_LIMIT_WINDOW,
	SecurityConfig.AUTH_RATE_LIMIT_MAX,
	'Too many authentication attempts, please try again later.',
	'authentication'
);

// XSS Protection middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
	let sanitizationOccurred = false;
	const originalData = {
		body: req.body ? JSON.stringify(req.body) : null,
		query: req.query ? JSON.stringify(req.query) : null,
		params: req.params ? JSON.stringify(req.params) : null
	};

	// Sanitize request body
	if (req.body && typeof req.body === 'object') {
		const sanitized = sanitizeObject(req.body);
		if (JSON.stringify(sanitized) !== JSON.stringify(req.body)) {
			sanitizationOccurred = true;
		}
		req.body = sanitized;
	}

	// Sanitize query parameters
	if (req.query && typeof req.query === 'object') {
		const sanitized = sanitizeObject(req.query) as typeof req.query;
		if (JSON.stringify(sanitized) !== JSON.stringify(req.query)) {
			sanitizationOccurred = true;
		}
		req.query = sanitized;
	}

	// Sanitize URL parameters
	if (req.params && typeof req.params === 'object') {
		const sanitized = sanitizeObject(req.params) as typeof req.params;
		if (JSON.stringify(sanitized) !== JSON.stringify(req.params)) {
			sanitizationOccurred = true;
		}
		req.params = sanitized;
	}

	// Log if sanitization occurred
	if (sanitizationOccurred) {
		SecurityLogger.xssSanitization(req, originalData);
	}

	next();
};

// Recursive function to sanitize objects
function sanitizeObject(obj: unknown): unknown {
	if (typeof obj === 'string') {
		return xss(obj);
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => sanitizeObject(item));
	}

	if (obj && typeof obj === 'object') {
		const sanitized: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
			}
		}
		return sanitized;
	}

	return obj;
}

// Input validation middleware
export const inputValidation = (req: Request, res: Response, next: NextFunction) => {
	// Check for suspicious patterns in request
	const suspiciousPatterns = [
		{ pattern: /(<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>)/gi, type: 'script_injection' },
		{ pattern: /(javascript:|vbscript:|onload=|onerror=)/gi, type: 'javascript_protocol' },
		{ pattern: /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/gi, type: 'nosql_injection' },
		{ pattern: /(union\s+select|drop\s+table|insert\s+into|delete\s+from)/gi, type: 'sql_injection' }
	];

	const requestString = JSON.stringify({
		body: req.body,
		query: req.query,
		params: req.params
	});

	for (const { pattern, type } of suspiciousPatterns) {
		if (pattern.test(requestString)) {
			SecurityLogger.maliciousInputBlocked(req, type, {
				body: req.body,
				query: req.query,
				params: req.params
			});

			return res.status(400).json({
				success: false,
				message: 'Malicious input detected'
			});
		}
	}

	next();
};

/**
 * Register all security middleware
 */
export function registerSecurityMiddleware(app: Application) {
	// Helmet - Security headers
	app.use(
		helmet({
			contentSecurityPolicy: false, // CSP disabled
			crossOriginEmbedderPolicy: false, // Disable for API usage
			hsts: {
				maxAge: SecurityConfig.HSTS_MAX_AGE,
				includeSubDomains: true,
				preload: true
			}
		})
	);

	// MongoDB sanitization - Remove prohibited characters
	app.use(
		mongoSanitize({
			replaceWith: SecurityConfig.MONGO_SANITIZE_REPLACE,
			onSanitize: ({ req, key }) => {
				SecurityLogger.mongodbSanitization(req, key);
			}
		})
	);

	// HTTP Parameter Pollution protection
	app.use(
		hpp({
			whitelist: ['tags', 'categories'] // Allow arrays for these parameters
		})
	);

	// General rate limiting
	app.use(generalRateLimit);

	// XSS Protection
	app.use(xssProtection);

	// Input validation
	app.use(inputValidation);

	// Security headers middleware
	app.use((req: Request, res: Response, next: NextFunction) => {
		// Remove server information
		res.removeHeader('X-Powered-By');

		// Add custom security headers
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('X-Frame-Options', 'DENY');
		res.setHeader('X-XSS-Protection', '1; mode=block');
		res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
		res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

		// Security headers are applied automatically - no need to log every request

		next();
	});
}

// Export specific rate limiters for use in routes
export { authRateLimit as authLimiter };
