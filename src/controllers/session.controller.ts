import { Request, Response } from 'express';
import { SessionManager } from '../services/session.service';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

const sessionManager = new SessionManager();

/**
 * Get all active sessions
 */
export const getAllSessions = async (req: Request, res: Response) => {
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

	const result = await sessionManager.terminateSessionById(sessionId).catch(() => false);

	if (!result) {
		return ApiRes(res, {
			status: HttpStatus.NOT_FOUND,
			msg: 'Session not found or could not be terminated'
		});
	}

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
	const sessions = await sessionManager.getUserSessions(userId).catch(() => null);

	return ApiRes(res, {
		status: sessions ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
		data: sessions
	});
};
