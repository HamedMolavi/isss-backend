import { Request } from 'express';
import { Logger } from '.';
import { getClientIP } from '../tools/util.tools';

/**
 * Security event types
 */
export enum SecurityEventType {
	RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
	XSS_SANITIZATION = 'xss_sanitization',
	MONGODB_SANITIZATION = 'mongodb_sanitization',
	MALICIOUS_INPUT_BLOCKED = 'malicious_input_blocked',
	SUSPICIOUS_ACTIVITY = 'suspicious_activity',
	SECURITY_CONFIG_ACCESSED = 'security_config_accessed',
	SECURITY_CONFIG_UPDATED = 'security_config_updated',
	PASSWORD_REQUIREMENTS_UPDATED = 'password_requirements_updated',
	RATE_LIMIT_CONFIG_UPDATED = 'rate_limit_config_updated',
	SESSION_CONFIG_UPDATED = 'session_config_updated',
	LOG_BACKUP_CONFIG_UPDATED = 'log_backup_config_updated',
	MAX_SESSIONS_CONFIG_UPDATED = 'max_sessions_config_updated',
	FUNCTIONAL_BEHAVIOR_CHANGED = 'functional_behavior_changed'
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
			ip: getClientIP(req) || 'unknown',
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

	/**
	 * Log changes to functional behavior or user group policies
	 */
	static functionalBehaviorChanged(req: Request, behavior: string, details?: Record<string, unknown>): void {
		Logger.info('Functional behavior changed', {
			...this.createBaseLogData(req, SecurityEventType.FUNCTIONAL_BEHAVIOR_CHANGED, true),
			details: {
				behavior,
				...details
			}
		});
	}

	/**
	 * Log security configuration access
	 */
	static securityConfigAccessed(req: Request): void {
		Logger.info('Security configuration accessed', {
			...this.createBaseLogData(req, SecurityEventType.SECURITY_CONFIG_ACCESSED, true)
		});
	}

	/**
	 * Log security configuration update
	 */
	static securityConfigUpdated(
		req: Request,
		configType: string,
		updatedFields?: Record<string, unknown>
	): void {
		Logger.info(`Security configuration updated: ${configType}`, {
			...this.createBaseLogData(req, SecurityEventType.SECURITY_CONFIG_UPDATED, true),
			details: {
				configType,
				updatedFields
			}
		});
	}

	/**
	 * Log password requirements update
	 */
	static passwordRequirementsUpdated(req: Request, requirements: Array<{ re: string; label: string }>): void {
		Logger.info('Password requirements updated', {
			...this.createBaseLogData(req, SecurityEventType.PASSWORD_REQUIREMENTS_UPDATED, true),
			details: {
				newRequirements: requirements.map((r) => ({ pattern: r.re, label: r.label }))
			}
		});
	}

	/**
	 * Log rate limit configuration update
	 */
	static rateLimitConfigUpdated(req: Request, settings: Record<string, unknown>): void {
		Logger.info('Rate limit configuration updated', {
			...this.createBaseLogData(req, SecurityEventType.RATE_LIMIT_CONFIG_UPDATED, true),
			details: settings
		});
	}

	/**
	 * Log session configuration update
	 */
	static sessionConfigUpdated(req: Request, timeout: number): void {
		Logger.info('Session configuration updated', {
			...this.createBaseLogData(req, SecurityEventType.SESSION_CONFIG_UPDATED, true),
			details: {
				newTimeout: timeout,
				timeoutMinutes: Math.round(timeout / (60 * 1000))
			}
		});
	}

	/**
	 * Log log backup configuration update
	 */
	static logBackupConfigUpdated(req: Request, settings: Record<string, unknown>): void {
		Logger.info('Log backup configuration updated', {
			...this.createBaseLogData(req, SecurityEventType.LOG_BACKUP_CONFIG_UPDATED, true),
			details: settings
		});
	}

	/**
	 * Log max sessions configuration update
	 */
	static maxSessionsConfigUpdated(req: Request, maxSessions: number): void {
		Logger.info('Max concurrent sessions configuration updated', {
			...this.createBaseLogData(req, SecurityEventType.MAX_SESSIONS_CONFIG_UPDATED, true),
			details: {
				newMaxSessions: maxSessions
			}
		});
	}
}
