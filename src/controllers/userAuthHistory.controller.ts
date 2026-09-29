import { Request, Response } from 'express';
import { Log } from '../db/mongo/models/secLog';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { parseUserAgent, ACTION_LABELS } from '../utils/logFormatter';
import { LoginRateLimiter } from '../middleware/login-rate-limit.middleware';
import { Logger } from '../logger';
import { getClientIP } from '../tools/util.tools';

/**
 * Get authentication history for the current user
 * Includes login attempts (successful and failed), logouts, and session events
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort: Sort order - 'asc' or 'desc' (default: 'desc')
 * - startDate: Filter logs from this date (ISO format)
 * - endDate: Filter logs until this date (ISO format)
 * - action: Filter by specific action type
 */
export const getMyAuthHistory = async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		return ApiRes(res, {
			status: HttpStatus.UNAUTHORIZED,
			msg: 'Authentication required'
		});
	}

	// Pagination
	const page = Math.max(1, parseInt(req.query.page as string) || 1);
	const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
	const skip = (page - 1) * limit;

	// Sorting
	const sortOrder = req.query.sort === 'asc' ? 1 : -1;

	// Date filtering
	const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
	const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

	// Action filter
	const actionFilter = req.query.action as string;

	try {
		// Build base query for user's auth logs
		const baseQuery: Record<string, unknown> = {
			$or: [
				{ 'metadata.userid': user._id.toString() },
				{ 'metadata.username': user.username },
				{ 'metadata.details.attemptedCredentials.username': user.username },
				{ 'metadata.details.affectedUserIds': user._id.toString() },
				{ 'metadata.details.affectedUsernames': user.username }
			]
		};

		// Add date range filter
		if (startDate || endDate) {
			baseQuery.timestamp = {};
			if (startDate && !isNaN(startDate.getTime())) {
				(baseQuery.timestamp as Record<string, Date>).$gte = startDate;
			}
			if (endDate && !isNaN(endDate.getTime())) {
				(baseQuery.timestamp as Record<string, Date>).$lte = endDate;
			}
		}

		// Define allowed auth actions
		const authActions = [
			'login_success',
			'login_failed',
			'login_error',
			'login_blocked',
			'logout',
			'session_expired',
			'unauthorized_access',
			'otp_generated',
			'otp_enabled',
			'otp_disabled',
			'otp_verification_failed',
			'ip_restriction_enabled',
			'ip_restriction_disabled',
			'ip_added',
			'ip_removed',
			'ip_access_denied',
			'user_integrity_violation'
		];

		// Add action filter
		if (actionFilter && authActions.includes(actionFilter)) {
			baseQuery.action = actionFilter;
		} else {
			baseQuery.action = { $in: authActions };
		}

		const [logs, total, loginInfo] = await Promise.all([
			Log.find(baseQuery)
				.sort({ timestamp: sortOrder })
				.skip(skip)
				.limit(limit)
				.select({
					level: 1,
					timestamp: 1,
					message: 1,
					action: 1,
					'metadata.ip': 1,
					'metadata.userAgent': 1,
					'metadata.success': 1,
					'metadata.details': 1
				})
				.lean()
				.exec(),
			Log.countDocuments(baseQuery).exec(),
			LoginRateLimiter.getUserInfo(user.username.toLowerCase().trim())
		]);

		// Format logs for cleaner response with detailed client info
		const formattedLogs = logs.map((log) => {
			const parsedUA = parseUserAgent(String(log.metadata?.userAgent || ''));
			return {
				id: log._id,
				timestamp: log.timestamp,
				action: log.action,
				actionLabel: ACTION_LABELS[log.action] || log.action,
				success: log.metadata?.success ?? (log.action === 'login_success' || log.action === 'logout'),
				ip: log.metadata?.ip || 'unknown',
				client: {
					browser: parsedUA.browser,
					os: parsedUA.os,
					device: parsedUA.device,
					summary: parsedUA.summary,
					raw: parsedUA.raw
				},
				message: log.message,
				details: log.metadata?.details || {}
			};
		});

		const clientIp = getClientIP(req);
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.info('User auth history viewed', {
			type: 'auth_history',
			action: 'auth_history_view',
			success: true,
			userId: user._id?.toString(),
			username: user.username,
			ip: clientIp,
			userAgent,
			params: {
				page,
				limit,
				sort: sortOrder,
				startDate,
				endDate,
				actionFilter
			}
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				logs: formattedLogs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
					hasNext: page < Math.ceil(total / limit),
					hasPrev: page > 1
				},
				filters: {
					sort: sortOrder === 1 ? 'asc' : 'desc',
					startDate: startDate?.toISOString() || null,
					endDate: endDate?.toISOString() || null,
					action: actionFilter || null
				},
				availableActions: authActions,
				loginAttempts: {
					// Current rate limit status (may be 0 if recently successful)
					currentAttempts: loginInfo.attempts,
					isBlocked: loginInfo.isBlocked,
					blockedUntil: loginInfo.blockedUntil || null,
					// Calculate summary from history
					totalAttempts: loginInfo.allAttempts.length,
					successfulAttempts: loginInfo.allAttempts.filter((a) => a.success).length,
					failedAttempts: loginInfo.allAttempts.filter((a) => !a.success).length,
					latestIP: loginInfo.allAttempts[0]?.ip || null,
					firstAttempt: loginInfo.allAttempts[loginInfo.allAttempts.length - 1]?.timestamp || null,
					lastAttempt: loginInfo.allAttempts[0]?.timestamp || null,
					allAttempts: (loginInfo.allAttempts || []).map((attempt) => {
						const parsedUA = parseUserAgent(attempt.userAgent || '');
						return {
							timestamp: attempt.timestamp,
							ip: attempt.ip,
							success: attempt.success,
							client: {
								browser: parsedUA.browser,
								os: parsedUA.os,
								device: parsedUA.device,
								summary: parsedUA.summary
							}
						};
					})
				}
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to fetch auth history', {
			type: 'auth_history',
			action: 'auth_history_view',
			success: false,
			userId: user._id?.toString(),
			username: user.username,
			ip: getClientIP(req),
			userAgent,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		console.error('Error fetching auth history:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch authentication history'
		});
	}
};

/**
 * Get authentication summary for the current user
 * Quick overview of recent auth activity
 */
export const getMyAuthSummary = async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		return ApiRes(res, {
			status: HttpStatus.UNAUTHORIZED,
			msg: 'Authentication required'
		});
	}

	try {
		const baseQuery = {
			$or: [
				{ 'metadata.userid': user._id.toString() },
				{ 'metadata.username': user.username },
				{ 'metadata.details.attemptedCredentials.username': user.username }
			],
			action: { $in: ['login_success', 'login_failed'] }
		};

		// Fetch last 10 auth events regardless of time
		const recentLogs = await Log.find(baseQuery)
			.sort({ timestamp: -1 })
			.limit(10)
			.select({ timestamp: 1, action: 1, 'metadata.ip': 1, 'metadata.userAgent': 1 })
			.lean()
			.exec();

		const successfulLogins = recentLogs.filter((l) => l.action === 'login_success').length;
		const failedLogins = recentLogs.filter((l) => l.action === 'login_failed').length;

		const lastSuccessfulLogin = recentLogs.find((l) => l.action === 'login_success') || null;
		const lastFailedLogin = recentLogs.find((l) => l.action === 'login_failed') || null;

		const uniqueIPs = Array.from(
			new Set(
				recentLogs
					.map((l: { metadata?: { ip?: string } }) => l?.metadata?.ip)
					.filter((ip: string | undefined) => !!ip)
			)
		);

		const lastSuccessfulLoginParsedUA = lastSuccessfulLogin
			? parseUserAgent(String(lastSuccessfulLogin.metadata?.userAgent || ''))
			: null;
		const lastFailedLoginParsedUA = lastFailedLogin
			? parseUserAgent(String(lastFailedLogin.metadata?.userAgent || ''))
			: null;

		const clientIp = getClientIP(req);
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.info('User auth summary viewed', {
			type: 'auth_history',
			action: 'auth_summary_view',
			success: true,
			userId: user._id?.toString(),
			username: user.username,
			ip: clientIp,
			userAgent
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				period: 'last_10_events',
				periodLabel: '۱۰ رویداد اخیر',
				successfulLogins,
				failedLogins,
				lastSuccessfulLogin: lastSuccessfulLogin
					? {
							timestamp: lastSuccessfulLogin.timestamp,
							ip: lastSuccessfulLogin.metadata?.ip,
							client: {
								browser: lastSuccessfulLoginParsedUA?.browser,
								os: lastSuccessfulLoginParsedUA?.os,
								device: lastSuccessfulLoginParsedUA?.device,
								summary: lastSuccessfulLoginParsedUA?.summary
							}
						}
					: null,
				lastFailedLogin: lastFailedLogin
					? {
							timestamp: lastFailedLogin.timestamp,
							ip: lastFailedLogin.metadata?.ip,
							client: {
								browser: lastFailedLoginParsedUA?.browser,
								os: lastFailedLoginParsedUA?.os,
								device: lastFailedLoginParsedUA?.device,
								summary: lastFailedLoginParsedUA?.summary
							}
						}
					: null,
				uniqueIPsUsed: uniqueIPs.length
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to fetch auth summary', {
			type: 'auth_history',
			action: 'auth_summary_view',
			success: false,
			userId: user._id?.toString(),
			username: user.username,
			ip: getClientIP(req),
			userAgent,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		console.error('Error fetching auth summary:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to fetch authentication summary'
		});
	}
};
