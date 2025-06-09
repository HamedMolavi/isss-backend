import { Request, Response } from 'express';
import { UserIntegrityService } from '../services/userIntegrity.service';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { Logger } from '../logger';

/**
 * Verify integrity of usernames
 */
export const verifyUsernamesIntegrity = async (req: Request, res: Response) => {
	try {
		const count = req.query.count ? parseInt(req.query.count as string) : undefined;

		if (count && (count < 1 || count > 10000)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Count must be between 1 and 10000'
			});
		}

		const integrityService = UserIntegrityService.getInstance();
		const result = await integrityService.verifyUsernamesIntegrity(count);

		Logger.systemOperation('Username integrity verification requested via API', {
			action: 'API_USERNAME_INTEGRITY_VERIFICATION',
			userId: req.user?._id?.toString(),
			count: count || 'all',
			result
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Username integrity verification completed',
			data: result
		});
	} catch (error) {
		Logger.error('Failed to verify username integrity via API', {
			action: 'API_USERNAME_INTEGRITY_VERIFICATION_FAILED',
			userId: req.user?._id?.toString(),
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to verify username integrity'
		});
	}
};

/**
 * Check if a specific user's username has been modified
 */
export const checkUsernameModification = async (req: Request, res: Response) => {
	try {
		const { userId } = req.params;

		if (!userId) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'User ID is required'
			});
		}

		const integrityService = UserIntegrityService.getInstance();
		const isValid = await integrityService.checkUsernameModification(userId);

		Logger.systemOperation('Username modification check requested via API', {
			action: 'API_USERNAME_MODIFICATION_CHECK',
			userId: req.user?._id?.toString(),
			targetUserId: userId,
			isValid
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Username modification check completed',
			data: {
				userId,
				isValid,
				status: isValid ? 'INTACT' : 'MODIFIED'
			}
		});
	} catch (error) {
		Logger.error('Failed to check username modification via API', {
			action: 'API_USERNAME_MODIFICATION_CHECK_FAILED',
			userId: req.user?._id?.toString(),
			targetUserId: req.params.userId,
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to check username modification'
		});
	}
};

/**
 * Get user integrity service status
 */
export const getUserIntegrityStatus = async (req: Request, res: Response) => {
	try {
		const integrityService = UserIntegrityService.getInstance();
		const status = await integrityService.getServiceStatus();

		Logger.systemOperation('User integrity service status requested via API', {
			action: 'API_USER_INTEGRITY_STATUS',
			userId: req.user?._id?.toString()
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'User integrity service status retrieved',
			data: status
		});
	} catch (error) {
		Logger.error('Failed to get user integrity service status via API', {
			action: 'API_USER_INTEGRITY_STATUS_FAILED',
			userId: req.user?._id?.toString(),
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to get user integrity service status'
		});
	}
};
