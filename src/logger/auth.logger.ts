import { Request } from 'express';
import { Logger } from '.';
import { get_user_agent } from '../tools/user_agent.utility';

/**
 * Authentication event types
 */
export enum AuthEventType {
	LOGIN_ATTEMPT = 'login_attempt',
	LOGIN_SUCCESS = 'login_success',
	LOGIN_FAILED = 'login_failed',
	LOGIN_ERROR = 'login_error',
	LOGIN_BLOCKED = 'login_blocked',
	LOGOUT = 'logout',
	SESSION_EXPIRED = 'session_expired',
	UNAUTHORIZED_ACCESS = 'unauthorized_access',
	OTP_GENERATED = 'otp_generated',
	OTP_ENABLED = 'otp_enabled',
	OTP_DISABLED = 'otp_disabled',
	OTP_VERIFICATION_FAILED = 'otp_verification_failed',
	OTP_DISABLE_FAILED = 'otp_disable_failed',
	IP_RESTRICTION_ENABLED = 'ip_restriction_enabled',
	IP_RESTRICTION_DISABLED = 'ip_restriction_disabled',
	IP_ADDED = 'ip_added',
	IP_REMOVED = 'ip_removed',
	IP_ACCESS_DENIED = 'ip_access_denied'
}

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'key', 'apiKey', 'apiSecret', 'privateKey', 'otp'];

/**
 * Simplified authentication logger that works with LogType filtering
 */
export class AuthLogger {
	private static maskSensitiveFields(
		obj: Record<string, unknown> | undefined
	): Record<string, unknown> | undefined {
		if (!obj) return obj;

		const masked: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			const lowerKey = key.toLowerCase();
			const isSensitive = SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk.toLowerCase()));

			if (isSensitive && value !== undefined && value !== null) {
				masked[key] = '***MASKED***';
			} else if (value && typeof value === 'object' && !Array.isArray(value)) {
				masked[key] = this.maskSensitiveFields(value as Record<string, unknown>);
			} else {
				masked[key] = value;
			}
		}
		return masked;
	}

	private static normalizeConfigSnapshot(
		config?: Partial<{ allowed_ips?: unknown; ip_restricted?: unknown }>
	): Record<string, unknown> | undefined {
		if (!config) return undefined;

		const snapshot: Record<string, unknown> = {};
		if ('ip_restricted' in config) {
			snapshot.ip_restricted = config.ip_restricted;
		}
		if ('allowed_ips' in config) {
			const allowed = Array.isArray(config.allowed_ips) ? config.allowed_ips : [config.allowed_ips];
			snapshot.allowed_ips = allowed
				.filter((ip) => ip !== undefined && ip !== null)
				.map((ip) => (typeof ip === 'string' ? ip : ip?.toString?.() ?? String(ip)));
		}
		return snapshot;
	}

	private static createBaseLogData(req: Request, action: string, success: boolean) {
		const user_agent = get_user_agent(req);
		return {
			type: 'auth',
			action,
			success,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: user_agent.ip,
			userAgent: user_agent.user_agent,
			method: req.method,
			url: req.originalUrl || req.url,
			timestamp: new Date()
		};
	}

	/**
	 * Log successful login
	 */
	static loginSuccess(req: Request, sessionInfo?: { isRemembered?: boolean; maxAge?: number }): void {
		Logger.info('User login successful', {
			...this.createBaseLogData(req, AuthEventType.LOGIN_SUCCESS, true),
			details: {
				sessionId: req.sessionID,
				sessionInfo
			}
		});
	}

	/**
	 * Log failed login attempt
	 */
	static loginFailed(
		req: Request,
		error?: string,
		attemptedCredentials?: { username?: string; password?: string }
	): void {
		Logger.warn('User login failed', {
			...this.createBaseLogData(req, AuthEventType.LOGIN_FAILED, false),
			details: {
				error,
				attemptedCredentials
			}
		});
	}

	/**
	 * Log login error (system error during authentication)
	 */
	static loginError(req: Request, error: string, userId?: string): void {
		Logger.error('Authentication system error', {
			...this.createBaseLogData(req, AuthEventType.LOGIN_ERROR, false),
			userid: userId, // Override with specific userId if provided
			details: {
				error
			}
		});
	}

	/**
	 * Log login blocked due to rate limiting
	 */
	static loginBlocked(req: Request, reason: string, attemptedCredentials?: { username?: string }): void {
		Logger.warn('Login blocked - rate limit exceeded', {
			...this.createBaseLogData(req, AuthEventType.LOGIN_BLOCKED, false),
			details: {
				error: reason,
				attemptedCredentials
			}
		});
	}

	/**
	 * Log unauthorized access attempt
	 */
	static unauthorizedAccess(req: Request, reason?: string): void {
		Logger.warn('Unauthorized access attempt', {
			...this.createBaseLogData(req, AuthEventType.UNAUTHORIZED_ACCESS, false),
			details: {
				error: reason || 'No valid session'
			}
		});
	}

	/**
	 * Log user logout
	 */
	static logout(req: Request): void {
		Logger.info('User logout', {
			...this.createBaseLogData(req, AuthEventType.LOGOUT, true),
			details: {
				sessionId: req.sessionID
			}
		});
	}

	/**
	 * Log session expiration
	 */
	static sessionExpired(
		sessionId: string,
		userId?: string,
		sessionData?: {
			username?: string;
			role?: string;
			ip?: string;
			userAgent?: string;
			loginTime?: Date;
			lastActivity?: Date;
			isRemembered?: boolean;
		}
	): void {
		Logger.info('Session expired', {
			type: 'auth',
			action: AuthEventType.SESSION_EXPIRED,
			success: true,
			userid: userId,
			timestamp: new Date(),
			details: {
				sessionId,
				username: sessionData?.username,
				role: sessionData?.role,
				ip: sessionData?.ip,
				userAgent: sessionData?.userAgent,
				loginTime: sessionData?.loginTime,
				lastActivity: sessionData?.lastActivity,
				isRemembered: sessionData?.isRemembered,
				duration:
					sessionData?.loginTime && sessionData?.lastActivity
						? (sessionData.lastActivity.getTime() - sessionData.loginTime.getTime()) / 1000
						: undefined
			}
		});
	}

	/**
	 * Log session termination by admin
	 */
	static sessionTerminated(req: Request, terminatedSessionId: string, terminatedUserId?: string): void {
		Logger.info('Session terminated by admin', {
			...this.createBaseLogData(req, 'session_terminated', true),
			details: {
				terminatedSessionId,
				terminatedUserId
			}
		});
	}

	/**
	 * Log custom authentication events
	 */
	static customEvent(
		eventType: string,
		message: string,
		req: Request,
		success: boolean = true,
		additionalContext?: Record<string, unknown>
	): void {
		const logMethod = success ? Logger.info : Logger.warn;
		logMethod(message, {
			...this.createBaseLogData(req, eventType, success),
			details: additionalContext
		});
	}

	/**
	 * Log IP restriction enabled
	 */
	static ipRestrictionEnabled(
		req: Request,
		beforeConfig?: Record<string, unknown>,
		afterConfig?: Record<string, unknown>
	): void {
		const normalizedBefore = this.normalizeConfigSnapshot(beforeConfig);
		const normalizedAfter =
			this.normalizeConfigSnapshot(afterConfig) ??
			this.normalizeConfigSnapshot({
				...(beforeConfig ?? {}),
				ip_restricted: true
			});

		Logger.info('IP restriction enabled', {
			...this.createBaseLogData(req, AuthEventType.IP_RESTRICTION_ENABLED, true),
			details: {
				ip: get_user_agent(req).ip,
				before: this.maskSensitiveFields(normalizedBefore),
				after: this.maskSensitiveFields(normalizedAfter)
			}
		});
	}

	/**
	 * Log IP restriction disabled
	 */
	static ipRestrictionDisabled(
		req: Request,
		beforeConfig?: Record<string, unknown>,
		afterConfig?: Record<string, unknown>
	): void {
		const normalizedBefore = this.normalizeConfigSnapshot(beforeConfig);
		const normalizedAfter =
			this.normalizeConfigSnapshot(afterConfig) ??
			this.normalizeConfigSnapshot({
				...(beforeConfig ?? {}),
				ip_restricted: false
			});

		Logger.info('IP restriction disabled', {
			...this.createBaseLogData(req, AuthEventType.IP_RESTRICTION_DISABLED, true),
			details: {
				ip: get_user_agent(req).ip,
				before: this.maskSensitiveFields(normalizedBefore),
				after: this.maskSensitiveFields(normalizedAfter)
			}
		});
	}

	/**
	 * Log IP added to allowed list
	 */
	static ipAdded(
		req: Request,
		addedIP: string,
		beforeConfig?: Record<string, unknown>,
		afterConfig?: Record<string, unknown>
	): void {
		const normalizedBefore = this.normalizeConfigSnapshot(beforeConfig);
		const afterSnapshot =
			afterConfig ??
			this.normalizeConfigSnapshot({
				...(normalizedBefore ?? {}),
				allowed_ips: Array.from(
					new Set([...(normalizedBefore?.allowed_ips as string[] | undefined | unknown[]) ?? [], addedIP])
				)
			});

		Logger.info('IP added to allowed list', {
			...this.createBaseLogData(req, AuthEventType.IP_ADDED, true),
			details: {
				addedIP,
				currentIP: get_user_agent(req).ip,
				before: this.maskSensitiveFields(normalizedBefore),
				after: this.maskSensitiveFields(afterSnapshot)
			}
		});
	}

	/**
	 * Log IP removed from allowed list
	 */
	static ipRemoved(
		req: Request,
		removedIP: string,
		beforeConfig?: Record<string, unknown>,
		afterConfig?: Record<string, unknown>
	): void {
		const normalizedBefore = this.normalizeConfigSnapshot(beforeConfig);
		const allowedBefore = (normalizedBefore?.allowed_ips as string[] | undefined) ?? [];
		const afterSnapshot =
			afterConfig ??
			this.normalizeConfigSnapshot({
				...(normalizedBefore ?? {}),
				allowed_ips: allowedBefore.filter((ip) => ip !== removedIP)
			});

		Logger.info('IP removed from allowed list', {
			...this.createBaseLogData(req, AuthEventType.IP_REMOVED, true),
			details: {
				removedIP,
				currentIP: get_user_agent(req).ip,
				before: this.maskSensitiveFields(normalizedBefore),
				after: this.maskSensitiveFields(afterSnapshot)
			}
		});
	}

	/**
	 * Log IP access denied
	 */
	static ipAccessDenied(req: Request, attemptedIP: string): void {
		Logger.warn('IP access denied', {
			...this.createBaseLogData(req, AuthEventType.IP_ACCESS_DENIED, false),
			details: {
				attemptedIP,
				allowedIPs: req.user?.allowed_ips || []
			}
		});
	}
}
