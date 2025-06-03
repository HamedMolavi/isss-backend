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
 * Get logs grouped by actions
 */
export const getGroupedActions = async (req: Request, res: Response) => {
	const actionGroups = await Log.aggregate([
		{
			$group: {
				_id: '$action'
			}
		}
	]).catch(() => null);

	return ApiRes(res, {
		status: actionGroups ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: actionGroups
	});
};
