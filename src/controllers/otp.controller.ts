import { Request, Response, NextFunction } from 'express';
import OTPService from '../services/otp.service';
import User from '../db/mongo/models/user';
import { IUserDocument } from '../types/interfaces/user.interface';
import { AuthLogger, AuthEventType } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

export const generateOtp = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUserDocument;
		const { secret, qrCodeUrl } = await OTPService.generateSecret(user.username);

		await User.updateOne({ _id: user._id }, { otp_secret: secret, otp_auth_url: qrCodeUrl });

		AuthLogger.customEvent(AuthEventType.OTP_GENERATED, 'OTP secret generated successfully', req);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'OTP QR Code generated successfully',
			data: qrCodeUrl
		});
	} catch (error) {
		next(error);
	}
};

export const enableOtp = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { token } = req.body;
		const user = await User.findByIdWithOTP((req.user as IUserDocument)._id.toString());

		if (!user || !user.otp_secret) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'OTP secret not found. Please generate one first.'
			});
		}

		const isValid = OTPService.verifyToken(user.otp_secret, token);

		if (!isValid) {
			return ApiRes(res, { status: HttpStatus.BAD_REQUEST, msg: 'Invalid OTP token.' });
		}

		await User.updateOne({ _id: user._id }, { otp_enabled: true });

		AuthLogger.customEvent(AuthEventType.OTP_ENABLED, 'OTP enabled successfully', req);

		return ApiRes(res, { status: HttpStatus.OK, msg: 'OTP has been enabled successfully.' });
	} catch (error) {
		next(error);
	}
};

export const disableOtp = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { password } = req.body;
		const user = await User.findById((req.user as IUserDocument)._id);

		if (!user) {
			return ApiRes(res, { status: HttpStatus.NOT_FOUND, msg: 'User not found.' });
		}

		const isPasswordCorrect = user.checkPassword(password);
		if (!isPasswordCorrect) {
			return ApiRes(res, { status: HttpStatus.UNAUTHORIZED, msg: 'Incorrect password.' });
		}

		await User.updateOne({ _id: user._id }, { otp_enabled: false, otp_secret: null, otp_auth_url: null });

		AuthLogger.customEvent(AuthEventType.OTP_DISABLED, 'OTP disabled successfully', req);

		return ApiRes(res, { status: HttpStatus.OK, msg: 'OTP has been disabled.' });
	} catch (error) {
		next(error);
	}
};
