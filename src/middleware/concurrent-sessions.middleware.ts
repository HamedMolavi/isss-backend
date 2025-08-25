import { Request, Response, NextFunction } from 'express';
import { getSessionManager } from '../services/session.service';
import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { getSecurityConfig } from '../config/security.config';

/**
 * Middleware to limit concurrent sessions per user
 * Gets the max sessions limit dynamically from the current security configuration
 */

export function preventConcurrentSessions() {
	return async (req: Request, res: Response, next: NextFunction) => {
		// Only apply to login requests
		if (req.method !== 'POST' || !req.body.username) {
			return next();
		}

		try {
			// Get the current max sessions limit from the database configuration
			const securityConfig = await getSecurityConfig();
			const maxSessions = securityConfig.MAX_CONCURRENT_SESSIONS;

			// Check how many sessions user currently has
			const sessionManager = await getSessionManager();

			const allSessions = await sessionManager.getAllSessions();
			const userSessions = allSessions.filter((session) => session.user?.username === req.body.username);

			if (userSessions && userSessions.length >= maxSessions) {
				// User has reached maximum session limit - terminate all existing sessions
				try {
					const userId = userSessions[0]?.user?._id;
					if (!userId) {
						return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR });
					}

					await sessionManager.terminateUserSessions(userId);

					AuthLogger.loginFailed(req, `Terminated existing sessions due to maximum limit (${maxSessions})`, {
						username: req.body.username
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					AuthLogger.loginFailed(req, `Failed to terminate sessions: ${errorMessage}`, {
						username: req.body.username
					});
				}

				return ApiRes(res, {
					status: HttpStatus.FORBIDDEN,
					msg: `Maximum ${maxSessions} sessions allowed. Please Try Again.`
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
