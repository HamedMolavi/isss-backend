import { Router } from 'express';
import IPRestrictionService from '../../services/ipRestriction.service';
import { AuthLogger } from '../../logger/auth.logger';
import { ApiRes } from '../../utils/api.response';
import { HttpStatus } from '../../types/http_status';
import { dtoValidationMiddleware } from '../../validation/dto';
import { IPAddressDto } from '../../validation/dto/ip-restriction.dto';
import { formatToIPv4 } from '../../tools/util.tools';

const IPRestrictionRouter: Router = Router();

const route_prefix = '';

// Add IP to allowed list
IPRestrictionRouter.post(`${route_prefix}/add`, dtoValidationMiddleware(IPAddressDto), async (req, res) => {
	try {
		const { ip } = req.body;

		// Format and validate IP to IPv4
		const formattedIP = formatToIPv4(ip);
		if (!formattedIP) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Invalid IP address'
			});
		}

		const success = await IPRestrictionService.addAllowedIP(req.user, formattedIP);

		if (success) {
			AuthLogger.ipAdded(req, formattedIP);
			return ApiRes(res, {
				status: HttpStatus.OK,
				msg: 'IP added successfully'
			});
		} else {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Failed to add IP'
			});
		}
	} catch (error) {
		console.error('Error adding IP:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal server error'
		});
	}
});

// Remove IP from allowed list
IPRestrictionRouter.delete(
	`${route_prefix}/remove`,
	dtoValidationMiddleware(IPAddressDto),
	async (req, res) => {
		try {
			const { ip } = req.body;

			// Format and validate IP to IPv4
			const formattedIP = formatToIPv4(ip);
			if (!formattedIP) {
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: 'Invalid IP address'
				});
			}

			const success = await IPRestrictionService.removeAllowedIP(req.user, formattedIP);

			if (success) {
				AuthLogger.ipRemoved(req, formattedIP);
				return ApiRes(res, {
					status: HttpStatus.OK,
					msg: 'IP removed successfully'
				});
			} else {
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: 'Failed to remove IP'
				});
			}
		} catch (error) {
			console.error('Error removing IP:', error);
			return ApiRes(res, {
				status: HttpStatus.INTERNAL_SERVER_ERROR,
				msg: 'Internal server error'
			});
		}
	}
);

// Enable IP restriction
IPRestrictionRouter.post(`${route_prefix}/enable`, async (req, res) => {
	try {
		const success = await IPRestrictionService.enableIPRestriction(req.user);

		if (success) {
			AuthLogger.ipRestrictionEnabled(req);
			return ApiRes(res, {
				status: HttpStatus.OK,
				msg: 'IP restriction enabled successfully'
			});
		} else {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Failed to enable IP restriction'
			});
		}
	} catch (error) {
		console.error('Error enabling IP restriction:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal server error'
		});
	}
});

// Disable IP restriction
IPRestrictionRouter.post(`${route_prefix}/disable`, async (req, res) => {
	try {
		const success = await IPRestrictionService.disableIPRestriction(req.user);

		if (success) {
			AuthLogger.ipRestrictionDisabled(req);
			return ApiRes(res, {
				status: HttpStatus.OK,
				msg: 'IP restriction disabled successfully'
			});
		} else {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Failed to disable IP restriction'
			});
		}
	} catch (error) {
		console.error('Error disabling IP restriction:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal server error'
		});
	}
});

// Get current IP restriction status
IPRestrictionRouter.get(`${route_prefix}/status`, async (req, res) => {
	try {
		const ip = IPRestrictionService.getClientIP(req);
		const isAllowed = IPRestrictionService.isIPAllowed(req.user, ip);

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				ip_restricted: req.user.ip_restricted,
				current_ip: ip,
				is_allowed: isAllowed,
				allowed_ips: req.user.allowed_ips || []
			}
		});
	} catch (error) {
		console.error('Error getting IP restriction status:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal server error'
		});
	}
});

export default IPRestrictionRouter;
