import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logger';

const logger = new Logger();

/**
 * Handle user authentication after passport verification
 */
export const handleUserAuthentication = (req: Request, res: Response, next: NextFunction) => {
	if (!req.user || !req.user._id) {
		logger.authEvent(
			'unknown',
			'login',
			false,
			{
				error: 'User not found',
				action: 'auth_login_failed'
			},
			req
		);
		return res.status(401).json({ message: 'Authentication failed' });
	}

	logger.authEvent(
		req.user._id.toString(),
		'login',
		true,
		{
			action: 'auth_login_success'
		},
		req
	);
	next();
};
