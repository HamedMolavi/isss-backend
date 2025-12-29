import { Request, Response } from 'express';

import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { getSessionManager } from '../services/session.service';
import { parseUserAgent } from '../utils/logFormatter';

/**
 * Get all active sessions
 */

export const getAllSessions = async (req: Request, res: Response) => {
	const sessionManager = await getSessionManager();

	const sessions = await sessionManager.getFilteredSessions().catch(() => null);

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
 * Terminate a specific session belonging to the current authenticated user
 */
export const terminateMySession = async (req: Request, res: Response) => {
	const sessionId = req.params.id;
	const userId = req.user._id.toString();
	const currentSessionId = req.sessionID;

	if (!sessionId) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Session ID is required'
		});
	}

	// Do not allow terminating the currently active session
	if (sessionId === currentSessionId) {
		return ApiRes(res, {
			status: HttpStatus.BAD_REQUEST,
			msg: 'Cannot terminate the current active session'
		});
	}

	const sessionManager = await getSessionManager();

	// Ensure the session belongs to the current user
	const userSessions = await sessionManager.getUserSessions(userId).catch(() => []);
	const targetSession = userSessions.find((s) => s.session_id === sessionId);

	if (!targetSession) {
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'Session not found'
		});
	}

	const result = await sessionManager.terminateSessionById(sessionId).catch(() => false);

	if (!result) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Failed to terminate session'
		});
	}

	return ApiRes(res, {
		status: HttpStatus.OK,
		msg: 'Session terminated successfully'
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

	// Parse user agent for readability but keep the response shape the same
	const formattedSessions = sessions
		? sessions.map((session) => {
				const parsedUA = parseUserAgent(session.userAgent ?? '');
				return {
					...session,
					userAgent: parsedUA.summary
				};
			})
		: null;

	return ApiRes(res, {
		status: sessions ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: formattedSessions
	});
};

/**
 * Get current user's sessions
 */
export const getCurrentUserSessions = async (req: Request, res: Response) => {
	const userId = req.user._id.toString();
	const sessionManager = await getSessionManager();
	const currentSessionId = req.sessionID;

	const sessions = await sessionManager.getUserSessions(userId).catch(() => null);
	const formattedSessions = sessions
		? sessions.map((session) => {
				const parsedUA = parseUserAgent(session.userAgent ?? '');
				return {
					...session,
					userAgent: parsedUA.summary,
					isCurrent: session.session_id === currentSessionId
				};
			})
		: null;

	return ApiRes(res, {
		status: sessions ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: formattedSessions
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
