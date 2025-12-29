import { Request, Response, NextFunction } from 'express';
import OTPService from '../services/otp.service';
import User from '../db/mongo/models/user';
import { IUserDocument } from '../types/interfaces/user.interface';
import { AuthLogger, AuthEventType } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

/**
 * Generate OTP secret and QR code for user
 */
export const generateOtp = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUserDocument;
		if (!user) {
			return ApiRes(res, {
				status: HttpStatus.UNAUTHORIZED,
				msg: 'Authentication required'
			});
		}

		const { secret, qrCodeUrl, otpAuthUrl } = await OTPService.generateSecret(user.username);

		await User.updateOne({ _id: user._id }, { otp_secret: secret, otp_auth_url: otpAuthUrl });

		AuthLogger.customEvent(AuthEventType.OTP_GENERATED, 'OTP secret generated successfully', req);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'OTP QR Code generated successfully',
			data: { qrCodeUrl }
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Enable OTP for user after verifying token
 */
export const enableOtp = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { token } = req.body;

		// Validate token is provided
		if (!token) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'OTP token is required'
			});
		}

		// Validate token format
		if (!OTPService.isValidTokenFormat(token)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Invalid OTP token format. Token must be 6 digits.'
			});
		}

		const user = await User.findByIdWithOTP((req.user as IUserDocument)._id.toString());

		if (!user || !user.otp_secret) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'OTP secret not found. Please generate one first.'
			});
		}

		// Check if OTP is already enabled
		if (user.otp_enabled) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'OTP is already enabled for this account.'
			});
		}

		const isValid = OTPService.verifyToken(user.otp_secret, token);

		if (!isValid) {
			AuthLogger.customEvent(AuthEventType.OTP_VERIFICATION_FAILED, 'Invalid OTP token during enable', req);
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Invalid OTP token. Please check your authenticator app and try again.'
			});
		}

		await User.updateOne({ _id: user._id }, { otp_enabled: true });

		AuthLogger.customEvent(AuthEventType.OTP_ENABLED, 'OTP enabled successfully', req);

		return ApiRes(res, { status: HttpStatus.OK, msg: 'OTP has been enabled successfully.' });
	} catch (error) {
		next(error);
	}
};

/**
 * Disable OTP for user after verifying password
 */
export const disableOtp = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { password } = req.body;

		// Validate password is provided
		if (!password) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Password is required to disable OTP'
			});
		}

		const user = await User.findById((req.user as IUserDocument)._id);

		if (!user) {
			return ApiRes(res, { status: HttpStatus.NOT_FOUND, msg: 'User not found.' });
		}

		// Check if OTP is enabled
		if (!user.otp_enabled) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'OTP is not enabled for this account.'
			});
		}

		// checkPassword is a sync method, but verify it properly
		const isPasswordCorrect = user.checkPassword(password);
		if (!isPasswordCorrect) {
			AuthLogger.customEvent(AuthEventType.OTP_DISABLE_FAILED, 'Incorrect password during OTP disable', req);
			return ApiRes(res, { status: HttpStatus.UNAUTHORIZED, msg: 'Incorrect password.' });
		}

		await User.updateOne({ _id: user._id }, { otp_enabled: false, otp_secret: null, otp_auth_url: null });

		AuthLogger.customEvent(AuthEventType.OTP_DISABLED, 'OTP disabled successfully', req);

		return ApiRes(res, { status: HttpStatus.OK, msg: 'OTP has been disabled.' });
	} catch (error) {
		next(error);
	}
};

/**
 * Get OTP status for current user
 */
export const getOtpStatus = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUserDocument;
		if (!user) {
			return ApiRes(res, {
				status: HttpStatus.UNAUTHORIZED,
				msg: 'Authentication required'
			});
		}

		const userDoc = await User.findById(user._id).select('otp_enabled');

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				otp_enabled: userDoc?.otp_enabled || false
			}
		});
	} catch (error) {
		next(error);
	}
};
