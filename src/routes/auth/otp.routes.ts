import { Router, Request, Response, NextFunction } from 'express';
import OTPService from '../../authentication/otp';
import User from '../../db/mongo/models/user';
import { IUserDocument } from '../../types/interfaces/user.interface';
import { AuthLogger, AuthEventType } from '../../logger/auth.logger';

const OtpRouter: Router = Router();

// Endpoint to generate a new OTP secret and QR code
OtpRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUserDocument;
		const { secret, qrCodeUrl } = await OTPService.generateSecret(user.username);

		await User.updateOne({ _id: user._id }, { otp_secret: secret, otp_auth_url: qrCodeUrl });

		AuthLogger.customEvent(AuthEventType.OTP_GENERATED, 'OTP secret generated successfully', req);

		res.json({ qrCodeUrl });
	} catch (error) {
		next(error);
	}
});

// Endpoint to verify the token and enable OTP
OtpRouter.post('/enable', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { token } = req.body;
		const user = await User.findById((req.user as IUserDocument)._id);

		if (!user || !user.otp_secret) {
			return res.status(400).json({ message: 'OTP secret not found. Please generate one first.' });
		}

		const isValid = OTPService.verifyToken(user.otp_secret, token);

		if (!isValid) {
			return res.status(400).json({ message: 'Invalid OTP token.' });
		}

		await User.updateOne({ _id: user._id }, { otp_enabled: true });

		AuthLogger.customEvent(AuthEventType.OTP_ENABLED, 'OTP enabled successfully', req);

		res.json({ message: 'OTP has been enabled successfully.' });
	} catch (error) {
		next(error);
	}
});

// Endpoint to disable OTP
OtpRouter.post('/disable', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { password } = req.body;
		const user = await User.findById((req.user as IUserDocument)._id);

		if (!user) {
			return res.status(404).json({ message: 'User not found.' });
		}

		const isPasswordCorrect = user.checkPassword(password);
		if (!isPasswordCorrect) {
			return res.status(401).json({ message: 'Incorrect password.' });
		}

		await User.updateOne({ _id: user._id }, { otp_enabled: false, otp_secret: null, otp_auth_url: null });

		AuthLogger.customEvent(AuthEventType.OTP_DISABLED, 'OTP disabled successfully', req);

		res.json({ message: 'OTP has been disabled.' });
	} catch (error) {
		next(error);
	}
});

export default OtpRouter;
