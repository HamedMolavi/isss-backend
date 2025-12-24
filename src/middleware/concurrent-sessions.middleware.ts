import { Request, Response, NextFunction } from 'express';
import { getSessionManager } from '../services/session.service';
import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { getSecurityConfig } from '../config/security.config';

declare module 'express-serve-static-core' {
	interface Request {
		maxSessionsExceeded?: boolean;
	}
}

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
				// Parse cleanup intent from client
				const cleanupRequested = req.body.cleanup === true || req.body.cleanup === 'true';

				// User reached maximum session limit - optionally require confirmation
				req.maxSessionsExceeded = true;

				// If cleanup not explicitly requested, stop here so the UI can prompt the user
				if (!cleanupRequested) {
					AuthLogger.loginFailed(
						req,
						`Maximum session limit reached (${maxSessions}). Current sessions: ${userSessions.length}. Cleanup confirmation required.`,
						{
							username: req.body.username
						}
					);

					return ApiRes(res, {
						status: HttpStatus.CONFLICT,
						msg: `Maximum ${maxSessions} concurrent sessions reached. Send cleanup=true to close other sessions and continue.`
					});
				}

				// Cleanup requested: allow login to proceed; cleanup will happen post-auth
				AuthLogger.loginFailed(
					req,
					`Maximum session limit reached (${maxSessions}). Current sessions: ${userSessions.length}. Cleanup approved; proceeding with login.`,
					{
						username: req.body.username
					}
				);
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
