import { NextFunction, Request, Response } from 'express';
import { ValidatePassword } from '../../tools/password.tools';
import { getSecurityConfig } from '../../config/security.config';
import { ApiRes } from '../../utils/api.response';
import { HttpStatus } from '../../types/http_status';

export function passwordValidator(passwordFieldName: string = 'password') {
	return async (req: Request, res: Response, next: NextFunction) => {
		// Skip validation if password field is not present
		if (!req.body[passwordFieldName]) return next();

		// Skip validation for admin operations
		if (req.body.IamAdmin) return next();

		try {
			// Get password requirements from security config
			const securityConfig = await getSecurityConfig();
			const requirements = securityConfig.PASSWORD.REQUIREMENTS;
			const passwordValidatorInstance = new ValidatePassword(requirements);

			const password = req.body[passwordFieldName];
			const resultVerifyPassword = passwordValidatorInstance.getStrength(password);

			if (resultVerifyPassword < 99) {
				// Find which requirements failed for better error messaging
				const failedRequirements = requirements
					.filter((req: { re: RegExp; label: string }) => !req.re.test(password))
					.map((req: { re: RegExp; label: string }) => req.label);

				const errorMsg =
					failedRequirements.length > 0
						? `Password requirements not met: ${failedRequirements.join(', ')}`
						: 'Password is not strong enough';

				req.flash('error', errorMsg);
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: errorMsg
				});
			}

			return next();
		} catch (error) {
			// Log error and return server error response
			console.error('Error validating password:', error);
			return ApiRes(res, {
				status: HttpStatus.INTERNAL_SERVER_ERROR,
				msg: 'Failed to validate password'
			});
		}
	};
}
