import { Request, Response } from 'express';

import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { getSessionManager } from '../services/session.service';
import { LoginRateLimiter } from '../middleware/login-rate-limit.middleware';

/**
 * Get all active sessions
 */

export const getAllSessions = async (req: Request, res: Response) => {
	const sessionManager = await getSessionManager();

	const sessions = await sessionManager.getAllSessions().catch(() => null);

	return ApiRes(res, {
		status: sessions ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: sessions
	});
};

/**
 * Terminate a specific session by ID
 */
export const terminateSession = async (req: Request, res: Response) => {
	const sessionId = req.params.id;

	if (!sessionId) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Session ID is required'
		});
	}
	const sessionManager = await getSessionManager();

	// Get session info before terminating for logging
	const sessions = await sessionManager.getAllSessions();
	const targetSession = sessions.find((s) => s.session_id === sessionId);

	const result = await sessionManager.terminateSessionById(sessionId).catch(() => false);

	if (!result) {
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'Session not found or could not be terminated'
		});
	}

	// Log session termination by admin
	AuthLogger.sessionTerminated(req, sessionId, targetSession?.user?._id);

	req.flash('info', 'Session terminated successfully.');
	return ApiRes(res, {
		status: HttpStatus.OK,
		msg: 'Session terminated successfully'
	});
};

/**
 * Terminate all sessions except current one
 */
export const terminateAllSessions = async (req: Request, res: Response) => {
	const currentSessionId = req.sessionID;
	const sessionManager = await getSessionManager();

	const result = await sessionManager.terminateAllSessions(currentSessionId).catch(() => false);

	if (!result) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to terminate sessions'
		});
	}

	req.flash('info', 'All other sessions terminated successfully.');
	return ApiRes(res, {
		status: HttpStatus.OK,
		msg: 'All other sessions terminated successfully'
	});
};

/**
 * Get sessions for a specific user
 */
export const getUserSessions = async (req: Request, res: Response) => {
	const userId = req.params.userId;

	if (!userId) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'User ID is required'
		});
	}
	const sessionManager = await getSessionManager();

	const sessions = await sessionManager.getUserSessions(userId).catch(() => null);

	return ApiRes(res, {
		status: sessions ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: sessions
	});
};

/**
 * Get current user's sessions
 */
export const getCurrentUserSessions = async (req: Request, res: Response) => {
	const userId = req.user._id.toString();
	const sessionManager = await getSessionManager();

	const sessions = await sessionManager.getUserSessions(userId).catch(() => null);

	return ApiRes(res, {
		status: sessions ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: sessions
	});
};

/**
 * Terminate all sessions for a specific user by user ID
 */
export const terminateUserSessions = async (req: Request, res: Response) => {
	const userId = req.params.userId;

	if (!userId) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'User ID is required'
		});
	}

	// Get user sessions before terminating for logging
	const sessionManager = await getSessionManager();

	const userSessions = await sessionManager.getUserSessions(userId).catch(() => []);

	if (userSessions.length === 0) {
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'No active sessions found for this user'
		});
	}

	const result = await sessionManager.terminateUserSessions(userId).catch(() => false);

	if (!result) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to terminate user sessions'
		});
	}

	// Log session terminations by admin
	userSessions.forEach((session) => {
		AuthLogger.sessionTerminated(req, session.session_id, userId);
	});

	req.flash('info', `All sessions for user ${userId} terminated successfully.`);
	return ApiRes(res, {
		status: HttpStatus.OK,
		msg: `Terminated ${userSessions.length} session(s) for user`,
		data: { terminatedSessions: userSessions.length }
	});
};

/**
 * Get login attempts for the current user
 */
export const getCurrentUserLoginAttempts = async (req: Request, res: Response) => {
	const username = req.user.username;

	if (!username) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Username not found in session'
		});
	}

	try {
		const loginInfo = await LoginRateLimiter.getUserInfo(username.toLowerCase().trim());

		return ApiRes(res, {
			status: HttpStatus.OK,
			data: {
				username: username,
				summary: {
					attempts: loginInfo.attempts,
					isBlocked: loginInfo.isBlocked,
					latestIP: loginInfo.latestIP,
					blockedUntil: loginInfo.blockedUntil,
					firstAttempt: loginInfo.firstAttempt,
					lastAttempt: loginInfo.lastAttempt
				},
				allAttempts: loginInfo.allAttempts,
				totalRecords: loginInfo.allAttempts.length
			}
		});
	} catch (error) {
		console.error('Error retrieving current user login attempts:', error);
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to retrieve login attempts information'
		});
	}
};
