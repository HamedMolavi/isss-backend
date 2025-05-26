import { Request } from 'express';
import { Logger } from '.';

/**
 * Security event types
 */
export enum SecurityEventType {
	RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
	XSS_SANITIZATION = 'xss_sanitization',
	MONGODB_SANITIZATION = 'mongodb_sanitization',
	MALICIOUS_INPUT_BLOCKED = 'malicious_input_blocked',
	SUSPICIOUS_ACTIVITY = 'suspicious_activity'
}

/**
 * Security logger that works with LogType filtering
 */
export class SecurityLogger {
	private static createBaseLogData(req: Request, action: string, success: boolean) {
		return {
			type: 'security',
			action,
			success,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
			userAgent: req.get('User-Agent') ?? 'unknown',
			method: req.method,
			url: req.originalUrl || req.url,
			timestamp: new Date()
		};
	}

	/**
	 * Log rate limit exceeded
	 */
	static rateLimitExceeded(req: Request, limitType: string): void {
		Logger.warn('Rate limit exceeded', {
			...this.createBaseLogData(req, SecurityEventType.RATE_LIMIT_EXCEEDED, false),
			details: {
				limitType,
				sessionId: req.sessionID
			}
		});
	}

	/**
	 * Log XSS content sanitization
	 */
	static xssSanitization(req: Request, originalData: Record<string, unknown>): void {
		Logger.warn('XSS content sanitized', {
			...this.createBaseLogData(req, SecurityEventType.XSS_SANITIZATION, true),
			details: {
				originalData,
				sanitized: true
			}
		});
	}

	/**
	 * Log MongoDB injection attempt sanitization
	 */
	static mongodbSanitization(req: Request, sanitizedKey: string): void {
		Logger.warn('MongoDB injection attempt sanitized', {
			...this.createBaseLogData(req, SecurityEventType.MONGODB_SANITIZATION, true),
			details: {
				sanitizedKey,
				sanitized: true
			}
		});
	}

	/**
	 * Log malicious input blocked
	 */
	static maliciousInputBlocked(req: Request, attackType: string, requestData: Record<string, unknown>): void {
		Logger.error('Malicious input detected and blocked', {
			...this.createBaseLogData(req, SecurityEventType.MALICIOUS_INPUT_BLOCKED, false),
			details: {
				attackType,
				requestData,
				blocked: true
			}
		});
	}

	/**
	 * Log suspicious activity
	 */
	static suspiciousActivity(
		req: Request,
		activity: string,
		additionalDetails?: Record<string, unknown>
	): void {
		Logger.warn(`Suspicious activity: ${activity}`, {
			...this.createBaseLogData(req, SecurityEventType.SUSPICIOUS_ACTIVITY, false),
			details: {
				activity,
				...additionalDetails
			}
		});
	}
}
