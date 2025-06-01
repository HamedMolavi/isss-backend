import { Request, Response } from 'express';
import { SessionManager } from '../services/session.service';
import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

const sessionManager = new SessionManager();

/**
 * Logout the current user
 * Terminates the current session and logs the user out
 */
export const logout = async (req: Request, res: Response) => {
	// Check if user is authenticated
	if (!req.user) {
		return ApiRes(res, {
			status: HttpStatus.UNAUTHORIZED,
			msg: 'No active session to logout'
		});
	}

	const sessionId = req.sessionID;

	// Log the logout action before destroying the session
	AuthLogger.logout(req);

	try {
		// Terminate the session using SessionManager
		const terminated = await sessionManager.terminateSessionById(sessionId);

		if (!terminated) {
			return ApiRes(res, {
				status: HttpStatus.INTERNAL_SERVER_ERROR,
				msg: 'Failed to terminate session'
			});
		}

		// Destroy the current session
		req.session.destroy((err) => {
			if (err) {
				return ApiRes(res, {
					status: HttpStatus.INTERNAL_SERVER_ERROR,
					msg: 'Failed to logout'
				});
			}

			// Clear the session cookie
			res.clearCookie('connect.sid');

			return ApiRes(res, {
				status: HttpStatus.OK,
				msg: 'Logged out successfully'
			});
		});
	} catch {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Error during logout process'
		});
	}
};
