import { Request, Response, NextFunction } from 'express';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import passport from 'passport';
import cookie from 'cookie-signature';
import { AuthLogger } from '../logger/auth.logger';
import OTPService from '../services/otp.service';
import User from '../db/mongo/models/user';
import { getClientIP } from '../tools/util.tools';
import { getSessionManager } from '../services/session.service';

export function passportGate(req: Request, res: Response, next: NextFunction) {
	// Generic error message to prevent user enumeration
	const accessDeniedResponse = {
		status: HttpStatus.UNAUTHORIZED,
		msg: 'Access denied'
	};

	if (!req.user) {
		AuthLogger.unauthorizedAccess(req, 'No authenticated user');
		return ApiRes(res, accessDeniedResponse);
	}

	// Check if user is active
	if (req.user.is_active === false) {
		AuthLogger.unauthorizedAccess(req, 'User account is deactivated');
		return ApiRes(res, accessDeniedResponse);
	}

	// Update last activity time
	if (req.session.lastActivity) {
		req.session.lastActivity = new Date();
	}

	// Optional: Check if IP has changed - use consistent IP extraction
	// const currentIp = getClientIP(req);
	// if (req.session.ip && req.session.ip !== currentIp) {
	// AuthLogger.unauthorizedAccess(req, `IP address changed from ${req.session.ip} to ${currentIp}`);
	// Optionally uncomment to invalidate session on IP change:
	// return ApiRes(res, {
	// 	status: HttpStatus.UNAUTHORIZED,
	// 	msg: 'Session security violation'
	// });
	// }

	return next();
}

export function assignPassport(req: Request, res: Response, next: NextFunction) {
	passport.authenticate('login', async (err, user, info) => {
		if (err || !user) {
			// Store login failure info for rate limiter to record and respond
			req.loginFailed = {
				error: err?.message || info?.message,
				attemptedCredentials: {
					username: req.body.username,
					password: req.body.password
				}
			};
			return next();
		}

		// --- OTP Verification Step ---
		if (user.otp_enabled) {
			const { otp_token } = req.body;

			if (!otp_token) {
				// OTP is required but not provided. Signal to the frontend.
				return ApiRes(res, {
					status: HttpStatus.OK,
					data: { otp_required: true }
				});
			}

			const userWithSecret = await User.findById(user._id).select('+otp_secret');

			if (!userWithSecret || !userWithSecret.otp_secret) {
				AuthLogger.loginError(req, 'OTP is enabled but secret is missing.', user._id?.toString());
				return ApiRes(res, {
					status: HttpStatus.UNAUTHORIZED,
					msg: 'Invalid credentials'
				});
			}

			const isValid = OTPService.verifyToken(userWithSecret.otp_secret, otp_token);

			if (!isValid) {
				// Store OTP failure info for rate limiter to record and respond
				req.loginFailed = {
					error: 'Invalid OTP token',
					attemptedCredentials: { username: req.body.username }
				};
				return next();
			}
		}

		req.logIn(user, async (err) => {
			if (err) {
				AuthLogger.loginError(req, err.message, user._id?.toString());
				return ApiRes(res, {
					status: HttpStatus.INTERNAL_SERVER_ERROR,
					msg: 'Login error occurred'
				});
			}

			// Configure session based on user role and remember preference
			if (req.user.role !== 'admin') {
				const maxAge = req.body.is_remember ? 31536000000 : 28800000;
				req.session.cookie.maxAge = maxAge;
			}

			// Store essential session data - use consistent IP extraction
			const currentTime = new Date();
			const ip = getClientIP(req);
			req.session.ip = ip;
			req.session.userAgent = req.get('User-Agent');
			req.session.loginTime = currentTime;
			req.session.lastActivity = currentTime;
			req.session.userId = user._id?.toString();
			req.session.isRemembered = req.body.is_remember || false;

			// Persist login info to the user document
			const loginMetadata = {
				ip,
				userAgent: req.session.userAgent,
				loginTime: currentTime
			};

			try {
				await User.findByIdAndUpdate(user._id, {
					$set: {
						last_login: currentTime,
						last_operation: loginMetadata
					}
				});

				// Keep the in-memory user in sync for downstream middleware
				req.user.last_login = currentTime;
				req.user.last_operation = loginMetadata;
			} catch (updateErr) {
				AuthLogger.loginError(
					req,
					`Failed to update login metadata: ${(updateErr as Error).message}`,
					user._id?.toString()
				);
			}

			// Log successful authentication
			const sessionInfo = {
				isRemembered: req.body.is_remember || false,
				maxAge: req.session.cookie.maxAge,
				ip: req.session.ip,
				userAgent: req.session.userAgent,
				userId: user._id?.toString(),
				loginTime: currentTime
			};

			AuthLogger.loginSuccess(req, sessionInfo);

			req.session.save((err: Error) => {
				if (err) {
					AuthLogger.loginError(req, err.message, user._id?.toString());
					return ApiRes(res, {
						status: HttpStatus.INTERNAL_SERVER_ERROR,
						msg: 'Session save error'
					});
				}

				next();
			});
		});
	})(req, res, next);
}

export function sendTokenToclient(req: Request, res: Response) {
	const token = encodeURIComponent(
		's:' + cookie.sign(req.sessionID, process.env['SESSION_SECRET'] as string)
	);
	if (!req.sessionID) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal Error!'
		});
	} else {
		// Include must_change_password and previous_last_login in response
		const responseData: Record<string, unknown> = { token, ...req.user };
		if (req.user?.must_change_password) {
			responseData.must_change_password = true;
		}
		// Include previous last login for security display
		if (req.user?.previous_last_login) {
			responseData.last_successful_login = req.user.previous_last_login;
		}
		return ApiRes(res, {
			status: HttpStatus.OK,
			data: responseData
		});
	}
}

export function reLogin(req: Request, res: Response, next: NextFunction) {
	if (req.user) return sendTokenToclient(req, res);
	next();
}

export async function cleanupExcessSessions(req: Request, res: Response, next: NextFunction) {
	try {
		// Only act when login succeeded and max-session flag was set
		if (!req.user || req.loginFailed || !req.maxSessionsExceeded) {
			return next();
		}

		const sessionManager = await getSessionManager();
		const currentSessionId = req.sessionID;
		const userId = req.user._id?.toString();

		if (!currentSessionId || !userId) {
			return next();
		}

		// Collect other active sessions for logging context
		const userSessions = await sessionManager.getUserSessions(userId).catch(() => []);
		const otherSessions = userSessions.filter((s) => s.session_id !== currentSessionId);

		if (otherSessions.length === 0) {
			return next();
		}

		const terminated = await sessionManager.terminateUserSessions(userId, currentSessionId);

		if (terminated) {
			otherSessions.forEach((session) => {
				AuthLogger.sessionTerminated(req, session.session_id, userId);
			});
		}

		return next();
	} catch (error) {
		console.error('Error cleaning up excess sessions:', error);
		return next();
	}
}
