import { Request, Response } from 'express';
import { getSessionManager } from '../services/session.service';
import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { getSecurityConfig } from '../config/security.config';

const SESSION_TIMEOUT_REASONS = new Set([
	'timeout',
	'session_timeout',
	'session_expired',
	'inactive_session',
	'inactive_session_lock',
	'session_lock',
	'lock_timeout'
]);

function getLogoutReason(req: Request): string | undefined {
	const reason = req.body?.reason ?? req.body?.logoutReason ?? req.query?.reason;
	return typeof reason === 'string' ? reason.toLowerCase().trim() : undefined;
}

async function isSessionTimeoutLogout(req: Request): Promise<boolean> {
	const reason = getLogoutReason(req);
	if (reason && SESSION_TIMEOUT_REASONS.has(reason)) {
		return true;
	}

	if (req.body?.sessionExpired === true || req.body?.session_expired === true || req.body?.locked === true) {
		return true;
	}

	if (!req.session?.lastActivity) {
		return false;
	}

	const config = await getSecurityConfig();
	const lastActivity = new Date(req.session.lastActivity).getTime();
	return Number.isFinite(lastActivity) && Date.now() - lastActivity >= config.SESSION.TIMEOUT;
}

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
	const isTimeoutLogout = await isSessionTimeoutLogout(req);

	// Log before destroying the session so user/session context is still available.
	if (isTimeoutLogout) {
		AuthLogger.sessionExpired(sessionId, req.user._id?.toString(), {
			username: req.user.username,
			role: req.user.role,
			ip: req.session.ip,
			userAgent: req.session.userAgent,
			loginTime: req.session.loginTime,
			lastActivity: req.session.lastActivity,
			isRemembered: req.session.isRemembered
		});
	} else {
		AuthLogger.logout(req);
	}

	try {
		// Terminate the session using SessionManager
		const sessionManager = await getSessionManager();

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
