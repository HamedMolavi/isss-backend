import { Request } from 'express';
import session from 'express-session';
import { Logger } from '../logger';
import { AuthLogger } from '../logger/auth.logger';
import redisStore from '../db/redis/store.database';
import User from '../db/mongo/models/user';
import { RedisClientType } from 'redis';
import { connectSubscriber } from '../db/redis/connect.database';

/**
 * Interface representing a session with user information
 * Extends express-session's Session type to include our custom properties
 *
 * @property passport - Contains the user ID stored by Passport.js
 * @property lastAccess - Timestamp of the last session access
 */
interface SessionWithUser extends session.Session {
	passport?: {
		user: string; // User ID stored by Passport.js
	};
	lastAccess?: number;
}

/**
 * Interface extending Express Request to include our custom session type
 * Uses Omit to exclude the default session type and add our custom one
 *
 * @property session - Our custom session type with user information
 * @property sessionStore - The session store instance
 */
interface RequestWithSession extends Omit<Request, 'session'> {
	session: SessionWithUser;
	sessionStore: session.Store;
}

/**
 * Interface for the session data returned to clients
 * Contains formatted session and user information
 *
 * @property session_id - Unique identifier for the session
 * @property user - Formatted user data (if session has an associated user)
 * @property lastAccess - Timestamp of the last session access
 */
interface SessionWithUserData {
	session_id: string;
	user?: {
		_id: string;
		username: string;
		phone_number: string;
		role: string;
		last_login: Date;
	};
	lastAccess?: number;
}

interface ExtendedSessionData extends session.SessionData {
	passport?: {
		user: string;
	};
	lastAccess?: number;
}

/**
 * SessionManager class for handling session operations
 * Manages user sessions stored in Redis with MongoDB user data
 */
export class SessionManager {
	private store: session.Store;
	private subscriber: RedisClientType | null = null;

	constructor() {
		const store = redisStore();
		if (!store) {
			throw new Error('Failed to initialize Redis store');
		}
		this.store = store;
		this.setupExpirationMonitoring();
	}

	/**
	 * Set up Redis keyspace notifications for session expiration monitoring
	 */
	private async setupExpirationMonitoring() {
		try {
			this.subscriber = await connectSubscriber(process.env['REDIS_URL'] || '');

			this.subscriber.on('error', (err) => {
				console.log('Redis subscription error', err);
			});

			await this.subscriber.subscribe('__keyevent@0__:expired', async (sessionId) => {
				try {
					const session = await this.getSessionById(sessionId);
					const userId = session?.user?._id;

					AuthLogger.sessionExpired(sessionId, userId);

					console.log('Session expiration handled', sessionId, userId);
				} catch (error) {
					console.log('Error handling expired session', error);
				}
			});
		} catch (error) {
			console.log('Failed to initialize session expiration monitoring', error);
		}
	}

	/**
	 * Get session by ID
	 */
	private async getSessionById(sessionId: string): Promise<SessionWithUserData | null> {
		return new Promise((resolve) => {
			this.store.get(sessionId, async (err, sessionData) => {
				if (err || !sessionData) {
					resolve(null);
					return;
				}

				const extendedSession = sessionData as ExtendedSessionData;
				let userData;

				if (extendedSession.passport?.user) {
					const user = await User.findById(extendedSession.passport.user);
					if (user) {
						userData = {
							_id: user._id.toString(),
							username: user.username,
							phone_number: user.phone_number,
							role: user.role,
							last_login: user.last_login
						};
					}
				}

				resolve({
					session_id: sessionId,
					user: userData,
					lastAccess: extendedSession.lastAccess
				});
			});
		});
	}

	/**
	 * Retrieves all active sessions with associated user data
	 * Fetches user information from MongoDB for each session
	 *
	 * @returns Promise<SessionWithUserData[]> Array of sessions with user data
	 */
	async getAllSessions(): Promise<SessionWithUserData[]> {
		return new Promise((resolve) => {
			if (!this.store.all) {
				resolve([]);
				return;
			}
			this.store.all(async (err, sessions) => {
				if (err) {
					Logger.error('Failed to get all sessions', {
						type: 'session',
						action: 'get_all_sessions',
						details: { error: err.message }
					});
					resolve([]);
					return;
				}

				const sessionsWithUserData = await Promise.all(
					Object.values(sessions || {}).map(async (session) => {
						const sessionWithUser = session as unknown as SessionWithUser;
						let userData;

						if (sessionWithUser.passport?.user) {
							const user = await User.findById(sessionWithUser.passport.user);
							if (user) {
								userData = {
									_id: user._id.toString(),
									username: user.username,
									phone_number: user.phone_number,
									role: user.role,
									last_login: user.last_login
								};
							}
						}

						return {
							session_id: sessionWithUser.id,
							user: userData,
							lastAccess: sessionWithUser.lastAccess
						};
					})
				);

				resolve(sessionsWithUserData);
			});
		});
	}

	/**
	 * Terminates a specific session by its ID
	 *
	 * @param sessionId - The ID of the session to terminate
	 * @returns Promise<boolean> True if session was terminated successfully
	 */
	async terminateSessionById(sessionId: string): Promise<boolean> {
		return new Promise((resolve) => {
			this.store.destroy(sessionId, (err) => {
				if (err) {
					Logger.error('Failed to terminate session', {
						type: 'session',
						action: 'terminate_session',
						details: {
							sessionId,
							error: err.message
						}
					});
					resolve(false);
					return;
				}

				// Session terminated successfully - logging handled by caller if needed

				resolve(true);
			});
		});
	}

	/**
	 * Terminates all sessions except the current user's session
	 *
	 * @param currentSessionId - Optional ID of the current session to preserve
	 * @returns Promise<boolean> True if all sessions were terminated successfully
	 */
	async terminateAllSessions(currentSessionId?: string): Promise<boolean> {
		try {
			const sessions = await this.getAllSessions();
			const destroyPromises = sessions
				.filter((session) => session.session_id !== currentSessionId)
				.map((session) => this.terminateSessionById(session.session_id));
			await Promise.all(destroyPromises);
			return true;
		} catch (error) {
			Logger.error('Failed to terminate all sessions', {
				type: 'session',
				action: 'terminate_all_sessions',
				details: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
			return false;
		}
	}

	/**
	 * Terminates a session from a request object
	 *
	 * @param req - Express request object with session
	 * @returns Promise<boolean> True if session was terminated successfully
	 */
	async terminateSessionFromRequest(req: RequestWithSession): Promise<boolean> {
		if (!req.session?.id) {
			return false;
		}

		return this.terminateSessionById(req.session.id);
	}

	/**
	 * Retrieves all sessions for a specific user
	 *
	 * @param userId - The ID of the user
	 * @returns Promise<SessionWithUserData[]> Array of sessions for the user
	 */
	async getUserSessions(userId: string): Promise<SessionWithUserData[]> {
		const allSessions = await this.getAllSessions();
		return allSessions.filter((session) => session.user?._id === userId);
	}

	/**
	 * Check if user has an active session
	 *
	 * @param userId - The ID of the user to check
	 * @returns Promise<SessionWithUserData | null> Active session if exists, null otherwise
	 */
	async getActiveUserSession(userId: string): Promise<SessionWithUserData | null> {
		const userSessions = await this.getUserSessions(userId);
		return userSessions.length > 0 ? userSessions[0] : null;
	}

	/**
	 * Terminate all sessions for a specific user except the current one
	 *
	 * @param userId - The ID of the user
	 * @param currentSessionId - Optional current session ID to preserve
	 * @returns Promise<boolean> True if sessions were terminated successfully
	 */
	async terminateUserSessions(userId: string, currentSessionId?: string): Promise<boolean> {
		try {
			const userSessions = await this.getUserSessions(userId);
			const sessionsToTerminate = userSessions.filter((session) => session.session_id !== currentSessionId);

			const destroyPromises = sessionsToTerminate.map((session) =>
				this.terminateSessionById(session.session_id)
			);

			await Promise.all(destroyPromises);
			return true;
		} catch (error) {
			Logger.error('Failed to terminate user sessions', {
				type: 'session',
				action: 'terminate_user_sessions',
				details: {
					userId,
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
			return false;
		}
	}
}
