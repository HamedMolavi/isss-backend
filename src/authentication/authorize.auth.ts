import { Request, Response, NextFunction } from 'express';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import passport from 'passport';
import cookie from 'cookie-signature';
import { AuthLogger } from '../logger/auth.logger';
import OTPService from '../services/otp.service';
import User from '../db/mongo/models/user';
import { formatToIPv4 } from '../tools/util.tools';

export function passportGate(req: Request, res: Response, next: NextFunction) {
	if (!req.user) {
		AuthLogger.unauthorizedAccess(req, 'No authenticated user');
		return ApiRes(res, {
			status: HttpStatus.UNAUTHORIZED,
			msg: 'Unauthorized'
		});
	}

	// Check if user is active
	if (req.user.is_active === false) {
		AuthLogger.unauthorizedAccess(req, 'User account is deactivated');
		return ApiRes(res, {
			status: HttpStatus.FORBIDDEN,
			msg: 'Account deactivated'
		});
	}

	// Update last activity time
	if (req.session.lastActivity) {
		req.session.lastActivity = new Date();
	}

	// Optional: Check if IP has changed
	const currentIp = req.ip ?? req.socket.remoteAddress;
	if (req.session.ip && req.session.ip !== currentIp) {
		AuthLogger.unauthorizedAccess(req, `IP address changed from ${req.session.ip} to ${currentIp}`);
		// Optionally uncomment to invalidate session on IP change:
		// return ApiRes(res, {
		// 	status: HttpStatus.UNAUTHORIZED,
		// 	msg: 'Session security violation'
		// });
	}

	return next();
}

export function assignPassport(req: Request, res: Response, next: NextFunction) {
	passport.authenticate('login', async (err, user, info) => {
		if (err || !user) {
			AuthLogger.loginFailed(req, err?.message || info?.message, {
				username: req.body.username,
				password: req.body.password // Only logged for failed attempts
			});
			return ApiRes(res, {
				status: HttpStatus.UNAUTHORIZED,
				msg: 'Invalid credentials'
			});
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
				AuthLogger.loginFailed(req, 'Invalid OTP token', { username: req.body.username });
				return ApiRes(res, {
					status: HttpStatus.UNAUTHORIZED,
					msg: 'Invalid credentials'
				});
			}
		}

		req.logIn(user, (err) => {
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

			// Store essential session data
			const currentTime = new Date();
			const remoteAddress =
				(req.headers['x-real-ip'] as string) ||
				req.ip ||
				(Array.isArray(req.headers['x-forwarded-for'])
					? req.headers['x-forwarded-for'][0]
					: typeof req.headers['x-forwarded-for'] === 'string'
						? req.headers['x-forwarded-for']
						: undefined) ||
				'N/A';
			let ip = remoteAddress as string;
			ip = formatToIPv4(ip) || '';
			req.session.ip = ip;
			req.session.userAgent = req.get('User-Agent');
			req.session.loginTime = currentTime;
			req.session.lastActivity = currentTime;
			req.session.userId = user._id?.toString();
			req.session.isRemembered = req.body.is_remember || false;

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
		return ApiRes(res, {
			status: HttpStatus.OK,
			data: { token, ...req.user }
		});
	}
}

export function reLogin(req: Request, res: Response, next: NextFunction) {
	if (req.user) return sendTokenToclient(req, res);
	next();
}
