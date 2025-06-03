import { Request, Response } from 'express';
import { LogIntegrityService } from '../services/logIntegrity.service';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { Logger } from '../logger';

/**
 * Verify integrity of recent logs
 */
export const verifyRecentLogsIntegrity = async (req: Request, res: Response) => {
	try {
		const count = parseInt(req.query.count as string) || 1000;

		if (count < 1 || count > 10000) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Count must be between 1 and 10000'
			});
		}

		const integrityService = LogIntegrityService.getInstance();
		const result = await integrityService.verifyRecentLogsIntegrity(count);

		Logger.systemOperation('Log integrity verification requested via API', {
			action: 'API_LOG_INTEGRITY_VERIFICATION',
			userId: req.user?._id?.toString(),
			count,
			result
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Log integrity verification completed',
			data: result
		});
	} catch (error) {
		Logger.error('Failed to verify log integrity via API', {
			action: 'API_LOG_INTEGRITY_VERIFICATION_FAILED',
			userId: req.user?._id?.toString(),
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to verify log integrity'
		});
	}
};

/**
 * Check if a specific log has been modified
 */
export const checkLogModification = async (req: Request, res: Response) => {
	try {
		const { logId } = req.params;

		if (!logId) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Log ID is required'
			});
		}

		const integrityService = LogIntegrityService.getInstance();
		const isValid = await integrityService.checkLogModification(logId);

		Logger.systemOperation('Log modification check requested via API', {
			action: 'API_LOG_MODIFICATION_CHECK',
			userId: req.user?._id?.toString(),
			logId,
			isValid
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Log modification check completed',
			data: {
				logId,
				isValid,
				status: isValid ? 'INTACT' : 'MODIFIED'
			}
		});
	} catch (error) {
		Logger.error('Failed to check log modification via API', {
			action: 'API_LOG_MODIFICATION_CHECK_FAILED',
			userId: req.user?._id?.toString(),
			logId: req.params.logId,
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to check log modification'
		});
	}
};

/**
 * Get integrity service status
 */
export const getIntegrityStatus = async (req: Request, res: Response) => {
	try {
		const integrityService = LogIntegrityService.getInstance();
		const status = integrityService.getServiceStatus();

		Logger.systemOperation('Integrity service status requested via API', {
			action: 'API_INTEGRITY_STATUS',
			userId: req.user?._id?.toString()
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Integrity service status retrieved',
			data: status
		});
	} catch (error) {
		Logger.error('Failed to get integrity service status via API', {
			action: 'API_INTEGRITY_STATUS_FAILED',
			userId: req.user?._id?.toString(),
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to get integrity service status'
		});
	}
};
