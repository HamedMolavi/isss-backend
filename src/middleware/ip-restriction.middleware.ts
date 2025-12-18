import { Request, Response, NextFunction } from 'express';
import { IUserDocument } from '../types/interfaces/user.interface';
import IPRestrictionService from '../services/ipRestriction.service';
import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

export const checkIPRestriction = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// If login failed (no user), skip IP restriction check
		// The recordAttempt middleware will handle the error response
		if (!req.user || req.loginFailed) {
			return next();
		}

		const user = req.user as IUserDocument;

		// If IP restriction is not enabled for this user, skip the check
		if (!user.ip_restricted) {
			return next();
		}

		const ip = IPRestrictionService.getClientIP(req);

		if (!IPRestrictionService.isIPAllowed(user, ip)) {
			AuthLogger.ipAccessDenied(req, ip);

			// Ensure loginRateLimit is set for recordAttempt middleware
			if (!req.loginRateLimit) {
				req.loginRateLimit = {
					username: user.username.toLowerCase().trim(),
					ip: ip
				};
			}

			// Mark as login failed for rate limiter to record
			req.loginFailed = {
				error: 'IP address not allowed',
				attemptedCredentials: { username: user.username }
			};

			// Destroy the session that was created by assignPassport
			if (req.session) {
				req.session.destroy((err) => {
					if (err) {
						console.error('Error destroying session after IP restriction:', err);
					}
				});
			}

			// Logout the user to clear passport session
			req.logout();

			// Continue to next middleware (recordAttempt) to log this failed attempt
			// The recordAttempt middleware will send the error response
			return next();
		}

		next();
	} catch (error) {
		console.error('Error checking IP restrictions:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal server error while checking IP restriction'
		});
	}
};
