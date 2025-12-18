import { Request, Response } from 'express';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

/**
 * Get current server time
 * Returns server timestamp for client synchronization
 */
export const getServerTime = async (_req: Request, res: Response) => {
	const now = new Date();

	return ApiRes(res, {
		status: HttpStatus.OK,
		data: {
			timestamp: now.getTime(),
			iso: now.toISOString(),
			utc: now.toUTCString(),
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			offset: now.getTimezoneOffset()
		}
	});
};
