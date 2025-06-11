import { Request, Response, NextFunction } from 'express';
import { getSessionManager } from '../services/session.service';
import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

/**
 * Middleware to limit concurrent sessions per user
 * Allows up to 3 active sessions per user, rejects if limit exceeded
 */
export function preventConcurrentSessions(maxSessions: number = 5) {
	return async (req: Request, res: Response, next: NextFunction) => {
		// Only apply to login requests
		if (req.method !== 'POST' || !req.body.username) {
			return next();
		}

		try {
			// Check how many sessions user currently has
			const sessionManager = await getSessionManager();

			const allSessions = await sessionManager.getAllSessions();
			const userSessions = allSessions.filter((session) => session.user?.username === req.body.username);

			if (userSessions.length >= maxSessions) {
				// User has reached maximum session limit - reject new login
				AuthLogger.loginFailed(req, `User has reached maximum session limit (${maxSessions})`, {
					username: req.body.username
				});

				return ApiRes(res, {
					status: HttpStatus.FORBIDDEN,
					msg: `Maximum ${maxSessions} sessions allowed. Please logout from another device first.`
				});
			}

			// User has less than max sessions, continue with login
			next();
		} catch (error) {
			console.error('Error checking concurrent sessions:', error);
			// On error, allow login to continue
			next();
		}
	};
}
