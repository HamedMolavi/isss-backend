import { Request } from 'express';
import { Logger } from '.';

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
	private static extractRequestInfo(req: Request) {
		return {
			ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
			userAgent: req.get('User-Agent') ?? 'unknown',
			method: req.method,
			url: req.originalUrl || req.url
		};
	}

	/**
	 * Log successful login
	 */
	static loginSuccess(req: Request, sessionInfo?: { isRemembered?: boolean; maxAge?: number }): void {
		const requestInfo = this.extractRequestInfo(req);

		Logger.info('User login successful', {
			type: 'auth',
			action: AuthEventType.LOGIN_SUCCESS,
			success: true,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: requestInfo.ip,
			userAgent: requestInfo.userAgent,
			method: requestInfo.method,
			url: requestInfo.url,
			timestamp: new Date(),
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
		const requestInfo = this.extractRequestInfo(req);

		Logger.warn('User login failed', {
			type: 'auth',
			action: AuthEventType.LOGIN_FAILED,
			success: false,
			ip: requestInfo.ip,
			userAgent: requestInfo.userAgent,
			method: requestInfo.method,
			url: requestInfo.url,
			timestamp: new Date(),
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
		const requestInfo = this.extractRequestInfo(req);

		Logger.error('Authentication system error', {
			type: 'auth',
			action: AuthEventType.LOGIN_ERROR,
			success: false,
			userid: userId,
			username: req.user?.username,
			ip: requestInfo.ip,
			userAgent: requestInfo.userAgent,
			method: requestInfo.method,
			url: requestInfo.url,
			timestamp: new Date(),
			details: {
				error
			}
		});
	}

	/**
	 * Log unauthorized access attempt
	 */
	static unauthorizedAccess(req: Request, reason?: string): void {
		const requestInfo = this.extractRequestInfo(req);

		Logger.warn('Unauthorized access attempt', {
			type: 'auth',
			action: AuthEventType.UNAUTHORIZED_ACCESS,
			success: false,
			ip: requestInfo.ip,
			userAgent: requestInfo.userAgent,
			method: requestInfo.method,
			url: requestInfo.url,
			timestamp: new Date(),
			details: {
				error: reason || 'No valid session'
			}
		});
	}

	/**
	 * Log user logout
	 */
	static logout(req: Request): void {
		const requestInfo = this.extractRequestInfo(req);

		Logger.info('User logout', {
			type: 'auth',
			action: AuthEventType.LOGOUT,
			success: true,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: requestInfo.ip,
			userAgent: requestInfo.userAgent,
			method: requestInfo.method,
			url: requestInfo.url,
			timestamp: new Date(),
			details: {
				sessionId: req.sessionID
			}
		});
	}

	/**
	 * Log session expiration
	 */
	static sessionExpired(sessionId: string, userId?: string): void {
		Logger.info('Session expired', {
			type: 'auth',
			action: AuthEventType.SESSION_EXPIRED,
			success: true,
			userid: userId,
			timestamp: new Date(),
			details: {
				sessionId
			}
		});
	}

	/**
	 * Log session termination by admin
	 */
	static sessionTerminated(req: Request, terminatedSessionId: string, terminatedUserId?: string): void {
		const requestInfo = this.extractRequestInfo(req);

		Logger.info('Session terminated by admin', {
			type: 'auth',
			action: 'session_terminated',
			success: true,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: requestInfo.ip,
			userAgent: requestInfo.userAgent,
			method: requestInfo.method,
			url: requestInfo.url,
			timestamp: new Date(),
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
		const requestInfo = this.extractRequestInfo(req);

		const logMethod = success ? Logger.info : Logger.warn;
		logMethod(message, {
			type: 'auth',
			action: eventType,
			success,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: requestInfo.ip,
			userAgent: requestInfo.userAgent,
			method: requestInfo.method,
			url: requestInfo.url,
			timestamp: new Date(),
			details: additionalContext
		});
	}
}
