import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class OTPService {
	/**
	 * Generates a new OTP secret and a QR code for the user to scan.
	 * @param {string} username - The user's username, to be included in the OTP issuer name.
	 * @returns {Promise<{ secret: string; qrCodeUrl: string }>} - The base32 encoded secret and the data URL for the QR code.
	 */
	static async generateSecret(username: string): Promise<{ secret: string; qrCodeUrl: string }> {
		const secret = speakeasy.generateSecret({
			name: `Ariapa-Isss (${username})`
		});

		const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
		return { secret: secret.base32, qrCodeUrl };
	}

	/**
	 * Verifies an OTP token provided by the user.
	 * @param {string} secret - The user's base32 encoded OTP secret.
	 * @param {string} token - The OTP token from the user's authenticator app.
	 * @returns {boolean} - True if the token is valid, false otherwise.
	 */
	static verifyToken(secret: string, token: string): boolean {
		return speakeasy.totp.verify({
			secret,
			encoding: 'base32',
			token,
			window: 1 // Allow for a 30-second window on either side
		});
	}
}

export default OTPService;
