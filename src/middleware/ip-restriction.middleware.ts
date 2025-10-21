import { Request, Response, NextFunction } from 'express';
import { IUserDocument } from '../types/interfaces/user.interface';
import IPRestrictionService from '../services/ipRestriction.service';
import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

export const checkIPRestriction = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUserDocument;
		const ip = IPRestrictionService.getClientIP(req);

		if (!IPRestrictionService.isIPAllowed(user, ip)) {
			AuthLogger.ipAccessDenied(req, ip);
			return ApiRes(res, {
				status: HttpStatus.FORBIDDEN,
				msg: 'Access denied: IP address not allowed'
			});
		}

		next();
	} catch (error) {
		console.error('Error checking IP restrictions:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal server error while checking IP restriction'
		});
	}
};
