import { Router } from 'express';
import { generateOtp, enableOtp, disableOtp } from '../../controllers/otp.controller';

const OtpRouter: Router = Router();

// Endpoint to generate a new OTP secret and QR code
OtpRouter.post('/generate', generateOtp);

// Endpoint to verify the token and enable OTP
OtpRouter.post('/enable', enableOtp);

// Endpoint to disable OTP
OtpRouter.post('/disable', disableOtp);

export default OtpRouter;
