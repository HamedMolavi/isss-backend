import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types/classes/error.class';
import passport from 'passport';
import cookie from 'cookie-signature';
import { AuthLogger } from '../logger/auth.logger';

export function passportGate(req: Request, _res: Response, next: NextFunction) {
	//TODO: check ip too
	// const ip = req.ip ?? req.socket.remoteAddress;
	// || ip !== req.session.ip
	if (!req.user) {
		AuthLogger.unauthorizedAccess(req, 'No authenticated user');
		return next(new ApiError(401, 'Unauthorized'));
	}
	return next();
}

export function assignPassport(req: Request, res: Response, next: NextFunction) {
	passport.authenticate('login', (err, user, info) => {
		if (err || !user) {
			AuthLogger.loginFailed(req, err?.message || info?.message, {
				username: req.body.username,
				password: req.body.password // Only logged for failed attempts
			});
			return next(new ApiError(401, 'Invalid credentials'));
		}

		req.logIn(user, (err) => {
			if (err) {
				AuthLogger.loginError(req, err.message, user._id?.toString());
				return next(err);
			}

			req.session.save((err: Error) => {
				if (err) {
					AuthLogger.loginError(req, err.message, user._id?.toString());
					return next(err);
				}

				// Configure session based on user role and remember preference
				if (req.user.role !== 'admin') {
					const maxAge = req.body.is_remember ? 31536000000 : 28800000;
					req.session.cookie.maxAge = maxAge;
				}
				req.session.ip = req.ip ?? req.socket.remoteAddress;

				// Log successful authentication
				const sessionInfo = {
					isRemembered: req.body.is_remember || false,
					maxAge: req.session.cookie.maxAge
				};
				AuthLogger.loginSuccess(req, sessionInfo);

				next();
			});
		});
	})(req, res, next);
}

export function sendTokenToclient(req: Request, res: Response, next: NextFunction) {
	const token = encodeURIComponent(
		's:' + cookie.sign(req.sessionID, process.env['SESSION_SECRET'] as string)
	);
	if (!req.sessionID) next(new ApiError(500, 'Internal Error!'));
	else {
		return res.status(200).json({
			success: true,
			data: { token, ...req.user } //TODO: ...req.user,
		});
	}
}

export function reLogin(req: Request, res: Response, next: NextFunction) {
	if (req.user) return sendTokenToclient(req, res, next);
	next();
}
