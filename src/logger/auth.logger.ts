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
	LOGOUT = 'logout',
	SESSION_EXPIRED = 'session_expired',
	UNAUTHORIZED_ACCESS = 'unauthorized_access'
}

/**
 * Simplified authentication logger that works with LogType filtering
 */
export class AuthLogger {
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
}
