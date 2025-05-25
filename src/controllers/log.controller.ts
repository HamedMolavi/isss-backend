import { Request, Response } from 'express';
import { Log } from '../db/mongo/models/secLog';
import { checkLogStatus } from '../tools/logMonitor.tools';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

/**
 * Check log status
 */
export const getMonitorStatus = async (req: Request, res: Response) => {
	const stats = await checkLogStatus(req).catch(() => null);

	if (!stats) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to check log status'
		});
	}

	return ApiRes(res, {
		status: HttpStatus.OK,
		msg: 'Log status check completed',
		data: stats
	});
};

/**
 * Get logs grouped by messages
 */
export const getGroupedMessages = async (req: Request, res: Response) => {
	const messageGroups = await Log.aggregate([
		{
			$group: {
				_id: '$action'
			}
		}
	]).catch(() => null);

	return ApiRes(res, {
		status: messageGroups ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: messageGroups
	});
};
