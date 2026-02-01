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

const DEFAULT_HIDDEN_ACTIONS = new Set<string>([
	'permission_check_success',
	'permission_check_failed',
	...(ACTION_CATEGORIES.log_integrity || []),
	...(ACTION_CATEGORIES.backup_scheduler || [])
]);

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
 * - accessLevelName: Filter by access level name (supports multiple values)
 * - success: Filter by success status (true/false)
 * - startDate, endDate: Date range filter
 * - format: 'raw' for raw data, default is formatted/readable
 * - showHttpLogs: Show/hide HTTP logs (default: false)
 * - httpMethod: Filter by HTTP method (GET,POST,PUT,DELETE)
 */
export const getLogs = async (req: Request, res: Response) => {
	try {
		// Helpers
		const parseListParam = (value: unknown): string[] => {
			if (!value) return [];
			const raw = Array.isArray(value) ? value : [value];
			return raw
				.join(',')
				.split(',')
				.map((v) => v.trim())
				.filter(Boolean);
		};
		const intersectOrSet = (current: Set<string> | null, incoming: string[]): Set<string> | null => {
			if (!incoming.length) return current;
			if (!current) return new Set(incoming);
			const next = new Set<string>();
			incoming.forEach((v) => {
				if (current.has(v)) {
					next.add(v);
				}
			});
			return next;
		};

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
		const orConditions: Array<Record<string, unknown>> = [];

		// Track action filter separately so we can safely combine with HTTP visibility rules
		let actionSet: Set<string> | null = null;

		// Filter by action (supports comma-separated or repeated params)
		const requestedActions = parseListParam(req.query.action);
		actionSet = intersectOrSet(actionSet, requestedActions);

		// Filter by category (group of actions)
		const requestedCategories = parseListParam(req.query.category);
		if (requestedCategories.length) {
			const categoryActions = requestedCategories.flatMap((c) => ACTION_CATEGORIES[c] || []);
			actionSet = intersectOrSet(actionSet, categoryActions);
		}

		// Filter by level
		if (req.query.level) {
			query.level = req.query.level;
		}

		// Filter by access level name (matches current/previous/new fields in details)
		const accessLevelNames = parseListParam(req.query.accessLevelName);
		if (accessLevelNames.length) {
			const regexes = accessLevelNames.map((name) => new RegExp(name, 'i'));
			orConditions.push(
				...regexes.flatMap((regex) => [
					{ 'metadata.details.accessLevelName': regex },
					{ 'metadata.details.previousAccessLevel': regex },
					{ 'metadata.details.newAccessLevel': regex },
					{ 'metadata.details.accessLevel': regex }
				])
			);
		}

		// Filter by username
		if (req.query.username) {
			const baseUsernameFilter = query['metadata.username'] as Record<string, unknown>;
			query['metadata.username'] = {
				...baseUsernameFilter,
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

		// Apply OR conditions if any were added (e.g., access level name matching)
		if (orConditions.length) {
			(query as Record<string, unknown>).$or = orConditions;
		}

		// HTTP log visibility
		const showHttpLogs = req.query.showHttpLogs === 'true';

		// Filter by HTTP method if provided
		if (req.query.httpMethod) {
			const methods = parseListParam(req.query.httpMethod).map((m) => m.toUpperCase());
			query['metadata.method'] = { $in: methods };
		}

		// Hide HTTP logs and show only actions with labels when showHttpLogs is false
		if (!showHttpLogs) {
			// Get all actions that have labels defined (exclude permission checks and technical-only actions)
			const labeledActions = Object.keys(ACTION_LABELS).filter((a) => !DEFAULT_HIDDEN_ACTIONS.has(a));

			actionSet = intersectOrSet(actionSet, labeledActions);
		}

		// Apply action filter after combining all conditions
		if (actionSet) {
			if (actionSet.size === 0) {
				return ApiRes(res, {
					status: HttpStatus.OK,
					data: {
						logs: [],
						pagination: {
							page,
							limit,
							total: 0,
							totalPages: 0,
							hasNext: false,
							hasPrev: page > 1
						},
						filters: {
							sortBy,
							sortOrder: sortOrder === 1 ? 'asc' : 'desc',
							format,
							action: [],
							category: requestedCategories,
							level: req.query.level || null,
							accessLevelName: accessLevelNames.length ? accessLevelNames : null,
							username: req.query.username || null,
							ip: req.query.ip || null,
							success: req.query.success || null,
							startDate: req.query.startDate || null,
							endDate: req.query.endDate || null,
							showHttpLogs,
							httpMethod: req.query.httpMethod ? parseListParam(req.query.httpMethod) : null
						}
					}
				});
			}
			query.action = { $in: Array.from(actionSet) };
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
		const outputLogs = format === 'raw' ? logs : await formatLogs(logs as any);

		// Log access to logs listing
		const clientIp = getClientIP(req);
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.info('Logs retrieved', {
			type: 'log_access',
			action: 'logs_list',
			success: true,
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: clientIp,
			userAgent,
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
					action: actionSet ? Array.from(actionSet) : null,
					category: requestedCategories.length ? requestedCategories : null,
					level: req.query.level || null,
					accessLevelName: accessLevelNames.length ? accessLevelNames : null,
					username: req.query.username || null,
					ip: req.query.ip || null,
					success: req.query.success || null,
					startDate: req.query.startDate || null,
					endDate: req.query.endDate || null,
					showHttpLogs,
					httpMethod: req.query.httpMethod ? parseListParam(req.query.httpMethod) : null
				}
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to retrieve logs', {
			type: 'log_access',
			action: 'logs_list',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: getClientIP(req),
			userAgent
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
		const parseListParam = (value: unknown): string[] => {
			if (!value) return [];
			const raw = Array.isArray(value) ? value : [value];
			return raw
				.join(',')
				.split(',')
				.map((v) => v.trim())
				.filter(Boolean);
		};

		const intersectOrSet = (current: Set<string> | null, incoming: string[]): Set<string> | null => {
			if (!incoming.length) return current;
			if (!current) return new Set(incoming);
			const next = new Set<string>();
			incoming.forEach((v) => {
				if (current.has(v)) {
					next.add(v);
				}
			});
			return next;
		};

		// Build query based on current selections to return context-aware options
		const query: Record<string, unknown> = {
			'metadata.username': {
				$exists: true,
				$nin: ['system', 'unknown']
			}
		};

		const requestedActions = parseListParam(req.query.action);
		const requestedCategories = parseListParam(req.query.category);
		let actionSet: Set<string> | null = null;

		actionSet = intersectOrSet(actionSet, requestedActions);
		if (requestedCategories.length) {
			const categoryActions = requestedCategories.flatMap((c) => ACTION_CATEGORIES[c] || []);
			actionSet = intersectOrSet(actionSet, categoryActions);
		}

		// Level
		if (req.query.level) {
			query.level = req.query.level;
		}

		// Username
		if (req.query.username) {
			const baseUsernameFilter = (query['metadata.username'] as Record<string, unknown>) || {};
			query['metadata.username'] = {
				...baseUsernameFilter,
				$regex: req.query.username,
				$options: 'i'
			};
		}

		// IP
		if (req.query.ip) {
			query['metadata.ip'] = {
				$regex: req.query.ip,
				$options: 'i'
			};
		}

		// Success
		if (req.query.success !== undefined) {
			query['metadata.success'] = req.query.success === 'true';
		}

		// HTTP method
		if (req.query.httpMethod) {
			const methods = parseListParam(req.query.httpMethod).map((m) => m.toUpperCase());
			query['metadata.method'] = { $in: methods };
		}

		// HTTP visibility
		const showHttpLogs = req.query.showHttpLogs === 'true';
		if (!showHttpLogs) {
			const labeledActions = Object.keys(ACTION_LABELS).filter((a) => !DEFAULT_HIDDEN_ACTIONS.has(a));
			actionSet = intersectOrSet(actionSet, labeledActions);
		}

		// Date range
		if (req.query.startDate || req.query.endDate) {
			query.timestamp = {};
			if (req.query.startDate) {
				(query.timestamp as Record<string, Date>).$gte = new Date(req.query.startDate as string);
			}
			if (req.query.endDate) {
				(query.timestamp as Record<string, Date>).$lte = new Date(req.query.endDate as string);
			}
		}

		// Apply action filter if set
		if (actionSet) {
			if (actionSet.size === 0) {
				return ApiRes(res, {
					status: HttpStatus.OK,
					data: {
						actions: [],
						categories: [],
						levels: [],
						usernames: [],
						ips: [],
						httpMethods: [],
						sortOptions: [
							{ value: 'timestamp', label: 'زمان' },
							{ value: 'level', label: 'سطح' },
							{ value: 'metadata.username', label: 'نام کاربری' },
							{ value: 'metadata.ip', label: 'آدرس IP' }
						]
					}
				});
			}
			query.action = { $in: Array.from(actionSet) };
		}

		const categoryActionSet = requestedCategories.length
			? new Set(requestedCategories.flatMap((c) => ACTION_CATEGORIES[c] || []))
			: null;

		// Get unique values from the database using the built query so all options are interconnected
		const [uniqueActions, uniqueLevels, uniqueUsernames, uniqueIPs, uniqueHttpMethods] = await Promise.all([
			Log.distinct('action', query).exec(),
			Log.distinct('level', query).exec(),
			Log.distinct('metadata.username', query).exec(),
			Log.distinct('metadata.ip', query).exec(),
			Log.distinct('metadata.method', query).exec()
		]);

		// Categories: keep only those that contain at least one available action
		const resolvedCategoryOptions = getCategoryOptions().filter((opt) => {
			const actionsInCategory = ACTION_CATEGORIES[opt.value] || [];
			// If an action filter is applied, category must include that action
			if (actionSet) {
				return actionsInCategory.some((a) => actionSet!.has(a) && uniqueActions.includes(a));
			}
			// Otherwise, category must have at least one action present in unique results
			return actionsInCategory.some((a) => uniqueActions.includes(a));
		});

		// Actions: keep those present in DB results and matching category if selected
		const resolvedActionOptions = getActionOptions().filter((opt) => {
			const isAvailable = uniqueActions.includes(opt.value);
			const inCategory = categoryActionSet ? categoryActionSet.has(opt.value) : true;
			return isAvailable && inCategory;
		});

		// Levels: keep those present in DB results
		const resolvedLevelOptions = getLevelOptions().filter((opt) => uniqueLevels.includes(opt.value));

		// Usernames: from query results
		const resolvedUsernames = uniqueUsernames.filter((u) => u && u !== 'unknown').sort();

		// IPs: from query results
		const resolvedIPs = uniqueIPs.filter((ip) => ip).sort();

		// HTTP methods: from query results
		const resolvedHttpMethods = getHttpMethodOptions().filter((opt) =>
			uniqueHttpMethods.map((m: string) => m?.toUpperCase()).includes(opt.value)
		);

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				actions: resolvedActionOptions,
				categories: resolvedCategoryOptions,
				levels: resolvedLevelOptions,
				usernames: resolvedUsernames,
				ips: resolvedIPs,
				httpMethods: resolvedHttpMethods,
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
 * - accessLevelName: Filter by access level name (supports multiple values)
 * - success: Filter by success status (true/false)
 * - startDate, endDate: Date range filter
 * - format: 'raw' for raw data, default is formatted/readable
 * - showHttpLogs: Show/hide HTTP logs (default: false)
 * - httpMethod: Filter by HTTP method (GET,POST,PUT,DELETE)
 *
 * This mirrors the behavior of `getLogs` but is restricted to the
 * currently authenticated user's username.
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

		// Helpers (same behavior as getLogs)
		const parseListParam = (value: unknown): string[] => {
			if (!value) return [];
			const raw = Array.isArray(value) ? value : [value];
			return raw
				.join(',')
				.split(',')
				.map((v) => v.trim())
				.filter(Boolean);
		};

		const intersectOrSet = (current: Set<string> | null, incoming: string[]): Set<string> | null => {
			if (!incoming.length) return current;
			if (!current) return new Set(incoming);
			const next = new Set<string>();
			incoming.forEach((v) => {
				if (current.has(v)) {
					next.add(v);
				}
			});
			return next;
		};

		// Pagination
		const page = Math.max(1, parseInt(req.query.page as string) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
		const skip = (page - 1) * limit;

		// Output format
		const format = (req.query.format as string) || 'readable';

		// Sorting
		const sortBy = (req.query.sortBy as string) || 'timestamp';
		const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

		// Base query restricted to current user
		const query: Record<string, unknown> = {
			'metadata.username': user.username
		};
		const orConditions: Array<Record<string, unknown>> = [];

		// Track action filter like in getLogs
		let actionSet: Set<string> | null = null;

		// Filter by action (supports comma-separated or repeated params)
		const requestedActions = parseListParam(req.query.action);
		actionSet = intersectOrSet(actionSet, requestedActions);

		// Filter by category (group of actions)
		const requestedCategories = parseListParam(req.query.category);
		if (requestedCategories.length) {
			const categoryActions = requestedCategories.flatMap((c) => ACTION_CATEGORIES[c] || []);
			actionSet = intersectOrSet(actionSet, categoryActions);
		}

		// Filter by level
		if (req.query.level) {
			query.level = req.query.level;
		}

		// Filter by access level name (matches current/previous/new fields in details)
		const accessLevelNames = parseListParam(req.query.accessLevelName);
		if (accessLevelNames.length) {
			const regexes = accessLevelNames.map((name) => new RegExp(name, 'i'));
			orConditions.push(
				...regexes.flatMap((regex) => [
					{ 'metadata.details.accessLevelName': regex },
					{ 'metadata.details.previousAccessLevel': regex },
					{ 'metadata.details.newAccessLevel': regex },
					{ 'metadata.details.accessLevel': regex }
				])
			);
		}

		// Filter by success status
		if (req.query.success !== undefined) {
			query['metadata.success'] = req.query.success === 'true';
		}

		// Apply OR conditions if any were added (e.g., access level name matching)
		if (orConditions.length) {
			(query as Record<string, unknown>).$or = orConditions;
		}

		// HTTP log visibility
		const showHttpLogs = req.query.showHttpLogs === 'true';

		// Filter by HTTP method if provided
		if (req.query.httpMethod) {
			const methods = parseListParam(req.query.httpMethod).map((m) => m.toUpperCase());
			query['metadata.method'] = { $in: methods };
		}

		// Hide HTTP logs and show only actions with labels when showHttpLogs is false
		if (!showHttpLogs) {
			// Same behavior as getLogs, excluding permission checks and technical-only actions
			const labeledActions = Object.keys(ACTION_LABELS).filter((a) => !DEFAULT_HIDDEN_ACTIONS.has(a));
			actionSet = intersectOrSet(actionSet, labeledActions);
		}

		// Apply action filter after combining all conditions
		if (actionSet) {
			if (actionSet.size === 0) {
				// No matching actions for this user with current filters
				return ApiRes(res, {
					status: HttpStatus.OK,
					data: {
						logs: [],
						pagination: {
							page,
							limit,
							total: 0,
							totalPages: 0,
							hasNext: false,
							hasPrev: page > 1
						},
						filters: {
							sortBy,
							sortOrder: sortOrder === 1 ? 'asc' : 'desc',
							format,
							action: [],
							category: requestedCategories,
							level: req.query.level || null,
							success: req.query.success || null,
							startDate: req.query.startDate || null,
							endDate: req.query.endDate || null,
							showHttpLogs,
							httpMethod: req.query.httpMethod ? parseListParam(req.query.httpMethod) : null
						}
					}
				});
			}
			query.action = { $in: Array.from(actionSet) };
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
		const outputLogs = format === 'raw' ? logs : await formatLogs(logs as any);

		const clientIp = getClientIP(req);
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.info('User logs retrieved', {
			type: 'log_access',
			action: 'logs_list',
			success: true,
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: clientIp,
			userAgent,
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
					action: actionSet ? Array.from(actionSet) : null,
					category: requestedCategories.length ? requestedCategories : null,
					level: req.query.level || null,
					success: req.query.success || null,
					startDate: req.query.startDate || null,
					endDate: req.query.endDate || null,
					showHttpLogs,
					httpMethod: req.query.httpMethod ? parseListParam(req.query.httpMethod) : null
				}
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to retrieve user logs', {
			type: 'log_access',
			action: 'logs_list',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			userAgent,
			ip: getClientIP(req)
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
		const formattedLogs = format === 'raw' ? [doc] : await formatLogs([doc as any]);
		const outputLog = format === 'raw' ? doc : formattedLogs[0];

		const response = ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				log: outputLog,
				format
			}
		});

		const clientIp = getClientIP(req);
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.info('Log accessed by ID', {
			type: 'log_access',
			action: 'log_read',
			success: true,
			logId: id,
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: clientIp,
			userAgent,
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
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to access log by ID', {
			type: 'log_access',
			action: 'log_read',
			success: false,
			logId: req.params.id,
			userId: req.user?._id?.toString() ?? 'unknown',
			username: req.user?.username ?? 'unknown',
			ip: getClientIP(req),
			userAgent,
			error: err instanceof Error ? err.message : 'Unknown error'
		});
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'خطا در دریافت لاگ'
		});
	}
};
