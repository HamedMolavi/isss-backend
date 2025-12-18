import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class OTPService {
	// OTP token must be exactly 6 digits
	private static readonly TOKEN_REGEX = /^\d{6}$/;
	// Time window for token validation (2 = ±60 seconds to account for time drift)
	private static readonly TIME_WINDOW = 2;

	/**
	 * Generates a new OTP secret and a QR code for the user to scan.
	 * @param {string} username - The user's username, to be included in the OTP issuer name.
	 * @returns {Promise<{ secret: string; qrCodeUrl: string; otpAuthUrl: string }>} - The base32 encoded secret, QR code data URL, and otpauth URL.
	 */
	static async generateSecret(
		username: string
	): Promise<{ secret: string; qrCodeUrl: string; otpAuthUrl: string }> {
		const secret = speakeasy.generateSecret({
			name: `Ariapa-Isss (${username})`,
			issuer: 'Ariapa-Isss',
			length: 32 // 256-bit secret for better security
		});

		const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
		return {
			secret: secret.base32,
			qrCodeUrl,
			otpAuthUrl: secret.otpauth_url!
		};
	}

	/**
	 * Validates the format of an OTP token.
	 * @param {string} token - The OTP token to validate.
	 * @returns {boolean} - True if the token format is valid (6 digits).
	 */
	static isValidTokenFormat(token: string): boolean {
		if (!token || typeof token !== 'string') {
			return false;
		}
		return this.TOKEN_REGEX.test(token);
	}

	/**
	 * Verifies an OTP token provided by the user.
	 * @param {string} secret - The user's base32 encoded OTP secret.
	 * @param {string} token - The OTP token from the user's authenticator app.
	 * @returns {boolean} - True if the token is valid, false otherwise.
	 */
	static verifyToken(secret: string, token: string): boolean {
		// Validate token format first
		if (!this.isValidTokenFormat(token)) {
			return false;
		}

		return speakeasy.totp.verify({
			secret,
			encoding: 'base32',
			token,
			window: this.TIME_WINDOW // Allow for time drift (±60 seconds)
		});
	}

	/**
	 * Generates a current valid OTP token for testing purposes.
	 * Should only be used in development/testing environments.
	 * @param {string} secret - The user's base32 encoded OTP secret.
	 * @returns {string} - The current valid OTP token.
	 */
	static generateCurrentToken(secret: string): string {
		return speakeasy.totp({
			secret,
			encoding: 'base32'
		});
	}
}

export default OTPService;
