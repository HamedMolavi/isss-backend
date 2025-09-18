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
			const passwordValidator = new ValidatePassword(securityConfig.PASSWORD.REQUIREMENTS);

			const resultVerifyPassword = passwordValidator.getStrength(req.body[passwordFieldName]);

			if (resultVerifyPassword < 99) {
				req.flash('error', 'Password is not strong enough');
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: 'Password is not strong enough'
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
