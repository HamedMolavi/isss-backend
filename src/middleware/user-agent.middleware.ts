import { NextFunction, Request, Response } from 'express';
import { SecurityLogger } from '../logger/security.logger';
import { HttpStatus } from '../types/http_status';
import { ApiRes } from '../utils/api.response';
import { sanitizeUserAgent } from '../tools/user_agent.utility';

/**
 * Require and normalize User-Agent before authentication and request logging.
 */
export function requireUserAgent(req: Request, res: Response, next: NextFunction) {
	const userAgent = sanitizeUserAgent(req.headers['user-agent']);

	if (userAgent === 'unknown') {
		SecurityLogger.missingUserAgent(req);
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'User-Agent header is required'
		});
	}

	req.headers['user-agent'] = userAgent;
	return next();
}
