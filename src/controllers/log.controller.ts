import { Request, Response } from 'express';
import { Log } from '../db/mongo/models/secLog';
import { checkLogStatus } from '../tools/logMonitor.tools';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import {
	formatLogs,
	getActionOptions,
	getCategoryOptions,
	getLevelOptions,
	getHttpMethodOptions,
	ACTION_CATEGORIES,
	ACTION_LABELS
} from '../utils/logFormatter';
import { Logger } from '../logger';
import { getClientIP } from '../tools/util.tools';

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
			$match: {
				'metadata.username': {
					$exists: true,
					$nin: ['system', 'unknown']
				}
			}
		},
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

/**
 * Main endpoint for getting logs with pagination, filtering, and sorting
 * Supports both raw and formatted output
 *
 * Query params:
 * - page, limit: Pagination (default: page=1, limit=20, max=100)
 * - sortBy, sortOrder: Sorting (default: timestamp desc)
 * - action, level, category: Event filters
 * - username, ip: User filters
 * - success: Filter by success status (true/false)
 * - startDate, endDate: Date range filter
 * - format: 'raw' for raw data, default is formatted/readable
 * - showHttpLogs: Show/hide HTTP logs (default: false)
 * - httpMethod: Filter by HTTP method (GET,POST,PUT,DELETE)
 */
export const getLogs = async (req: Request, res: Response) => {
	try {
		// Pagination
		const page = Math.max(1, parseInt(req.query.page as string) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
		const skip = (page - 1) * limit;

		// Output format
		const format = (req.query.format as string) || 'readable';

		// Sorting
		const sortBy = (req.query.sortBy as string) || 'timestamp';
		const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

		// Build query
		const query: Record<string, unknown> = {
			'metadata.username': {
				$exists: true,
				$nin: ['system', 'unknown']
			}
		};

		// Track action filter separately so we can safely combine with HTTP visibility rules
		let actionFilter: string | { $in: string[] } | undefined;

		// Filter by action
		if (req.query.action) {
			actionFilter = req.query.action as string;
		}

		// Filter by category (group of actions)
		if (req.query.category) {
			const category = req.query.category as string;
			const categoryActions = ACTION_CATEGORIES[category];
			if (categoryActions && categoryActions.length > 0) {
				actionFilter = { $in: categoryActions };
			}
		}

		// Filter by level
		if (req.query.level) {
			query.level = req.query.level;
		}

		// Filter by username
		if (req.query.username) {
			query['metadata.username'] = {
				$regex: req.query.username,
				$options: 'i'
			};
		}

		// Filter by IP
		if (req.query.ip) {
			query['metadata.ip'] = {
				$regex: req.query.ip,
				$options: 'i'
			};
		}

		// Filter by success status
		if (req.query.success !== undefined) {
			query['metadata.success'] = req.query.success === 'true';
		}

		// HTTP log visibility
		const showHttpLogs = req.query.showHttpLogs === 'true';

		// Filter by HTTP method if provided
		if (req.query.httpMethod) {
			const methods = (req.query.httpMethod as string).split(',').map((m) => m.toUpperCase().trim());
			query['metadata.method'] = { $in: methods };
		}

		// Hide HTTP logs and show only actions with labels when showHttpLogs is false
		if (!showHttpLogs) {
			// Get all actions that have labels defined (exclude log viewing and permission check actions)
			const labeledActions = Object.keys(ACTION_LABELS).filter(
				(a) => a !== 'logs_list' && a !== 'log_read' && a !== 'permission_check_success'
			);

			// If action filter already exists, intersect it with allowed labeled actions
			if (actionFilter) {
				const requested = typeof actionFilter === 'string' ? [actionFilter] : actionFilter.$in || [];
				const intersected = requested.filter((a) => labeledActions.includes(a));
				actionFilter = { $in: intersected };
			} else {
				actionFilter = { $in: labeledActions };
			}
		}

		// Apply action filter after combining all conditions
		if (actionFilter) {
			query.action = actionFilter;
		}

		// Filter by date range
		if (req.query.startDate || req.query.endDate) {
			query.timestamp = {};
			if (req.query.startDate) {
				(query.timestamp as Record<string, Date>).$gte = new Date(req.query.startDate as string);
			}
			if (req.query.endDate) {
				(query.timestamp as Record<string, Date>).$lte = new Date(req.query.endDate as string);
			}
		}

		// Execute query
		const [logs, total] = await Promise.all([
			Log.find(query)
				.sort({ [sortBy]: sortOrder })
				.skip(skip)
				.limit(limit)
				.lean()
				.exec(),
			Log.countDocuments(query).exec()
		]);

		// Format logs based on format parameter
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const outputLogs = format === 'raw' ? logs : formatLogs(logs as any);

		// Log access to logs listing
		const clientIp = getClientIP(req);
		Logger.info('Logs retrieved', {
			type: 'log_access',
			action: 'logs_list',
			success: true,
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: clientIp,
			params: {
				page,
				limit,
				sortBy,
				sortOrder,
				format,
				filters: Object.keys(query)
			}
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				logs: outputLogs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
					hasNext: page < Math.ceil(total / limit),
					hasPrev: page > 1
				},
				filters: {
					sortBy,
					sortOrder: sortOrder === 1 ? 'asc' : 'desc',
					format,
					action: req.query.action || null,
					category: req.query.category || null,
					level: req.query.level || null,
					username: req.query.username || null,
					ip: req.query.ip || null,
					success: req.query.success || null,
					startDate: req.query.startDate || null,
					endDate: req.query.endDate || null,
					showHttpLogs,
					httpMethod: req.query.httpMethod || null
				}
			}
		});
	} catch (error) {
		Logger.error('Failed to retrieve logs', {
			type: 'log_access',
			action: 'logs_list',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: getClientIP(req)
		});
		console.error('Error fetching logs:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch logs'
		});
	}
};

/**
 * Get filter options for log queries
 * Returns available actions, categories, and levels with labels
 */
export const getFilterOptions = async (req: Request, res: Response) => {
	try {
		// Get unique values from the database
		const [uniqueActions, uniqueLevels, uniqueUsernames, uniqueIPs, uniqueHttpMethods] = await Promise.all([
			Log.distinct('action', {
				'metadata.username': { $exists: true, $nin: ['system', 'unknown'] }
			}).exec(),
			Log.distinct('level', {
				'metadata.username': { $exists: true, $nin: ['system', 'unknown'] }
			}).exec(),
			Log.distinct('metadata.username', {
				'metadata.username': { $exists: true, $nin: ['system', 'unknown'] }
			}).exec(),
			Log.distinct('metadata.ip', {
				'metadata.ip': { $exists: true, $ne: '' }
			}).exec(),
			Log.distinct('metadata.method', {
				'metadata.method': { $exists: true, $ne: null }
			}).exec()
		]);

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				actions: getActionOptions().filter((opt) => uniqueActions.includes(opt.value)),
				categories: getCategoryOptions(),
				levels: getLevelOptions().filter((opt) => uniqueLevels.includes(opt.value)),
				usernames: uniqueUsernames.filter((u) => u && u !== 'unknown').sort(),
				ips: uniqueIPs.filter((ip) => ip).sort(),
				httpMethods: getHttpMethodOptions().filter((opt) =>
					uniqueHttpMethods.map((m: string) => m?.toUpperCase()).includes(opt.value)
				),
				sortOptions: [
					{ value: 'timestamp', label: 'زمان' },
					{ value: 'level', label: 'سطح' },
					{ value: 'metadata.username', label: 'نام کاربری' },
					{ value: 'metadata.ip', label: 'آدرس IP' }
				]
			}
		});
	} catch (error) {
		console.error('Error fetching filter options:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch filter options'
		});
	}
};

/**
 * Get log statistics/summary
 * Returns counts by action, level, success rate, etc.
 */
export const getLogStats = async (req: Request, res: Response) => {
	try {
		const startDate = req.query.startDate
			? new Date(req.query.startDate as string)
			: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default last 7 days

		const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

		const baseQuery = {
			'metadata.username': { $exists: true, $nin: ['system', 'unknown'] },
			timestamp: { $gte: startDate, $lte: endDate }
		};

		const [byAction, byLevel, bySuccess, byUser, totalCount] = await Promise.all([
			// Group by action
			Log.aggregate([
				{ $match: baseQuery },
				{ $group: { _id: '$action', count: { $sum: 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 20 }
			]).exec(),

			// Group by level
			Log.aggregate([
				{ $match: baseQuery },
				{ $group: { _id: '$level', count: { $sum: 1 } } },
				{ $sort: { count: -1 } }
			]).exec(),

			// Group by success status
			Log.aggregate([
				{ $match: baseQuery },
				{ $group: { _id: '$metadata.success', count: { $sum: 1 } } }
			]).exec(),

			// Top users by activity
			Log.aggregate([
				{ $match: baseQuery },
				{ $group: { _id: '$metadata.username', count: { $sum: 1 } } },
				{ $sort: { count: -1 } },
				{ $limit: 10 }
			]).exec(),

			// Total count
			Log.countDocuments(baseQuery).exec()
		]);

		// Calculate success rate
		const successStats = bySuccess.reduce(
			(acc, item) => {
				if (item._id === true) acc.success = item.count;
				else if (item._id === false) acc.failed = item.count;
				else acc.unknown = item.count;
				return acc;
			},
			{ success: 0, failed: 0, unknown: 0 }
		);

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				period: {
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString()
				},
				total: totalCount,
				byAction: byAction.map((item) => ({
					action: item._id,
					count: item.count
				})),
				byLevel: byLevel.map((item) => ({
					level: item._id,
					count: item.count
				})),
				successRate: {
					successful: successStats.success,
					failed: successStats.failed,
					unknown: successStats.unknown,
					rate:
						successStats.success + successStats.failed > 0
							? Math.round((successStats.success / (successStats.success + successStats.failed)) * 100)
							: 0
				},
				topUsers: byUser.map((item) => ({
					username: item._id,
					count: item.count
				}))
			}
		});
	} catch (error) {
		console.error('Error fetching log stats:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch log statistics'
		});
	}
};

/**
 * Get logs for the currently logged-in user
 * Returns only logs belonging to the authenticated user
 *
 * Query params:
 * - page, limit: Pagination (default: page=1, limit=20, max=100)
 * - sortBy, sortOrder: Sorting (default: timestamp desc)
 * - action, level, category: Event filters
 * - success: Filter by success status (true/false)
 * - startDate, endDate: Date range filter
 * - format: 'raw' for raw data, default is formatted/readable
 */
export const getMyLogs = async (req: Request, res: Response) => {
	try {
		const user = req.user;

		if (!user || !user.username) {
			return ApiRes(res, {
				status: HttpStatus.UNAUTHORIZED,
				msg: 'User not authenticated'
			});
		}

		const page = Math.max(1, parseInt(req.query.page as string) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
		const skip = (page - 1) * limit;

		const format = (req.query.format as string) || 'readable';

		const sortBy = (req.query.sortBy as string) || 'timestamp';
		const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

		const query: Record<string, unknown> = {
			'metadata.username': user.username
		};

		let actionFilter: string | { $in: string[] } | undefined;

		const showHttpLogs = req.query.showHttpLogs === 'true';

		if (req.query.action) {
			actionFilter = req.query.action as string;
		}

		if (req.query.category) {
			const category = req.query.category as string;
			const categoryActions = ACTION_CATEGORIES[category];
			if (categoryActions && categoryActions.length > 0) {
				actionFilter = { $in: categoryActions };
			}
		}

		if (req.query.level) {
			query.level = req.query.level;
		}

		if (req.query.success !== undefined) {
			query['metadata.success'] = req.query.success === 'true';
		}

		if (req.query.httpMethod) {
			const methods = (req.query.httpMethod as string).split(',').map((m) => m.toUpperCase().trim());
			query['metadata.method'] = { $in: methods };
		}

		if (!showHttpLogs) {
			const labeledActions = Object.keys(ACTION_LABELS).filter(
				(a) => a !== 'logs_list' && a !== 'log_read' && a !== 'permission_check_success'
			);

			if (actionFilter) {
				const requested = typeof actionFilter === 'string' ? [actionFilter] : actionFilter.$in || [];
				const intersected = requested.filter((a) => labeledActions.includes(a));
				actionFilter = { $in: intersected };
			} else {
				actionFilter = { $in: labeledActions };
			}
		}

		if (actionFilter) {
			query.action = actionFilter;
		}

		if (req.query.startDate || req.query.endDate) {
			query.timestamp = {};
			if (req.query.startDate) {
				(query.timestamp as Record<string, Date>).$gte = new Date(req.query.startDate as string);
			}
			if (req.query.endDate) {
				(query.timestamp as Record<string, Date>).$lte = new Date(req.query.endDate as string);
			}
		}

		const [logs, total] = await Promise.all([
			Log.find(query)
				.sort({ [sortBy]: sortOrder })
				.skip(skip)
				.limit(limit)
				.lean()
				.exec(),
			Log.countDocuments(query).exec()
		]);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const outputLogs = format === 'raw' ? logs : formatLogs(logs as any);

		Logger.info('User logs retrieved', {
			type: 'log_access',
			action: 'logs_list',
			success: true,
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip,
			params: {
				page,
				limit,
				sortBy,
				sortOrder,
				format,
				filters: Object.keys(query)
			}
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				logs: outputLogs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
					hasNext: page < Math.ceil(total / limit),
					hasPrev: page > 1
				},
				filters: {
					sortBy,
					sortOrder: sortOrder === 1 ? 'asc' : 'desc',
					format,
					username: user.username,
					action: req.query.action || null,
					category: req.query.category || null,
					level: req.query.level || null,
					success: req.query.success || null,
					showHttpLogs,
					httpMethod: req.query.httpMethod || null,
					startDate: req.query.startDate || null,
					endDate: req.query.endDate || null
				}
			}
		});
	} catch (error) {
		Logger.error('Failed to retrieve user logs', {
			type: 'log_access',
			action: 'logs_list',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip
		});
		console.error('Error fetching user logs:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch user logs'
		});
	}
};

/**
 * Get log by ID
 * Returns a single log entry formatted like getLogs response
 */
export const getLogById = async (req: Request, res: Response) => {
	try {
		const id = req.params.id;
		const format = (req.query.format as string) || 'readable';

		const doc = await Log.findOne({
			_id: id,
			'metadata.username': {
				$exists: true,
				$nin: ['system', 'unknown']
			}
		})
			.lean()
			.exec();

		if (!doc) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'لاگ یافت نشد'
			});
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const outputLog = format === 'raw' ? doc : formatLogs([doc as any])[0];

		const response = ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				log: outputLog,
				format
			}
		});

		Logger.info('Log accessed by ID', {
			type: 'log_access',
			action: 'log_read',
			success: true,
			logId: id,
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip,
			format
		});

		return response;
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'kind' in err && err.kind === 'ObjectId') {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: `شناسه لاگ نامعتبر: ${req.params.id}`
			});
		}
		console.error('Error fetching log by ID:', err);
		Logger.error('Failed to access log by ID', {
			type: 'log_access',
			action: 'log_read',
			success: false,
			logId: req.params.id,
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip,
			error: err instanceof Error ? err.message : 'Unknown error'
		});
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'خطا در دریافت لاگ'
		});
	}
};
