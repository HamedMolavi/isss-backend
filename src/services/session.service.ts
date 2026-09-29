import { Request } from 'express';
import session from 'express-session';
import { Logger } from '../logger';
import { AuthLogger } from '../logger/auth.logger';
import redisStore from '../db/redis/store.database';
import User from '../db/mongo/models/user';
import { RedisClientType } from 'redis';
import { connectSubscriber, connect } from '../db/redis/connect.database';

/**
 * Interface representing a session with user information
 * Extends express-session's Session type to include our custom properties
 *
 * @property passport - Contains the user ID stored by Passport.js
 * @property ip - Client's IP address
 * @property userAgent - Browser/client information
 * @property loginTime - When the user logged in
 * @property lastActivity - Last session activity timestamp
 * @property userId - Database user identifier
 * @property isRemembered - Whether "remember me" was selected
 */
interface SessionWithUser extends session.Session {
	passport?: {
		user: string; // User ID stored by Passport.js
	};
	ip?: string;
	userAgent?: string;
	loginTime?: Date;
	lastActivity?: Date;
	userId?: string;
	isRemembered?: boolean;
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

type SessionBackupData = {
	userId: string;
	username: string;
	role: string;
	ip?: string;
	userAgent?: string;
	loginTime?: string;
	lastActivity?: string;
	isRemembered?: string;
};

/**
 * Interface for the session data returned to clients
 * Contains formatted session and user information
 *
 * @property session_id - Unique identifier for the session
 * @property user - Formatted user data (if session has an associated user)
 * @property ip - Client's IP address
 * @property userAgent - Browser/client information
 * @property loginTime - When the user logged in
 * @property lastActivity - Last session activity timestamp
 * @property isRemembered - Whether "remember me" was selected
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
	ip?: string;
	userAgent?: string;
	loginTime?: Date;
	lastActivity?: Date;
	isRemembered?: boolean;
	lastAccess?: number;
}

/**
 * Interface for filtered session data for public API responses
 * Contains only safe, non-sensitive session information
 *
 * @property session_id - Only the Bearer token part (e.g., 'Bearer Wk8nfsVj6Pw7rMut6dC0mXv08VGzqpnk')
 * @property user - Basic user information without sensitive data
 * @property ip - Client's IP address
 * @property userAgent - Browser/client information
 * @property loginTime - When the user logged in
 * @property lastActivity - Last session activity timestamp
 */
interface FilteredSessionData {
	session_id: string;
	user?: {
		username: string;
		role: string;
	};
	ip?: string;
	userAgent?: string;
	loginTime?: Date;
	lastActivity?: Date;
}

/**
 * SessionManager class for handling session operations
 * Manages user sessions stored in Redis with MongoDB user data
 */
export class SessionManager {
	private static instance: SessionManager | null = null;
	private static initializationPromise: Promise<SessionManager> | null = null;

	private store: session.Store;
	private subscriber: RedisClientType | null = null;
	private redisClient: RedisClientType | null = null;
	private isInitialized: boolean = false;

	private constructor() {
		const store = redisStore();
		if (!store) {
			throw new Error('Failed to initialize Redis store');
		}
		this.store = store;
	}

	/**
	 * Get the singleton instance of SessionManager
	 * Ensures only one instance exists and is properly initialized
	 */
	public static async getInstance(): Promise<SessionManager> {
		if (SessionManager.instance && SessionManager.instance.isInitialized) {
			return SessionManager.instance;
		}

		// If initialization is already in progress, wait for it
		if (SessionManager.initializationPromise) {
			return SessionManager.initializationPromise;
		}

		// Start initialization
		SessionManager.initializationPromise = SessionManager.initialize();
		return SessionManager.initializationPromise;
	}

	/**
	 * Initialize the SessionManager singleton
	 */
	private static async initialize(): Promise<SessionManager> {
		if (!SessionManager.instance) {
			SessionManager.instance = new SessionManager();
		}

		if (!SessionManager.instance.isInitialized) {
			await SessionManager.instance.setupExpirationMonitoring();
			SessionManager.instance.isInitialized = true;
		}

		return SessionManager.instance;
	}

	/**
	 * Set up Redis keyspace notifications for session expiration monitoring
	 */
	private async setupExpirationMonitoring() {
		if (this.subscriber) {
			return; // Already set up
		}

		try {
			this.subscriber = await connectSubscriber(process.env['REDIS_URL'] || '');
			this.redisClient = await connect(process.env['REDIS_URL'] || '');

			this.subscriber.on('error', (err) => {
				console.error('Redis subscription error:', err);
			});

			// Subscribe to the Redis database selected by REDIS_URL. Hard-coding DB 0
			// silently misses expirations when deployments use /1, /2, etc.
			const redisDatabase = this.getRedisDatabaseIndex(process.env['REDIS_URL']);
			await this.subscriber.subscribe(
				`__keyevent@${redisDatabase}__:expired`,
				this.handleSessionExpired.bind(this)
			);

			// console.log('Session expiration monitoring initialized');
		} catch (error) {
			console.error('Failed to initialize session expiration monitoring:', error);
			throw error;
		}
	}

	private getRedisDatabaseIndex(redisUrl?: string): number {
		if (!redisUrl) return 0;

		try {
			const database = Number.parseInt(new URL(redisUrl).pathname.replace('/', ''), 10);
			return Number.isInteger(database) && database >= 0 ? database : 0;
		} catch {
			return 0;
		}
	}

	/**
	 * Handle session expiration event
	 */
	private async handleSessionExpired(sessionId: string) {
		try {
			const cleanSessionId = this.cleanSessionId(sessionId);
			const userInfo = await this.getUserInfoFromBackup(cleanSessionId);

			if (userInfo) {
				AuthLogger.sessionExpired(cleanSessionId, userInfo.userId, {
					username: userInfo.username,
					role: userInfo.role,
					// Get additional session data from Redis
					ip: userInfo.ip,
					userAgent: userInfo.userAgent,
					loginTime: userInfo.loginTime ? new Date(userInfo.loginTime) : undefined,
					lastActivity: userInfo.lastActivity ? new Date(userInfo.lastActivity) : undefined,
					isRemembered: userInfo.isRemembered === 'true'
				});
				await this.cleanupUserInfoBackup(cleanSessionId);
			}
		} catch (error) {
			console.error('Error handling expired session:', error);
		}
	}

	/**
	 * Clean session ID by removing prefixes
	 */
	private cleanSessionId(sessionId: string): string {
		return sessionId.replace('Bearer ', '');
	}

	/**
	 * Find session by ID from all active sessions
	 */
	private async findSessionById(sessionId: string): Promise<SessionWithUserData | null> {
		const allSessions = await this.getAllSessions();
		return allSessions.find((s) => s.session_id === sessionId) || null;
	}

	/**
	 * Backup user info before session expires
	 */
	private async backupUserInfo(sessionId: string, userInfo: SessionBackupData, ttlSeconds: number = 360) {
		const userInfoKey = `user_info:${sessionId}`;
		await this.redisClient?.set(userInfoKey, JSON.stringify(userInfo), { EX: ttlSeconds });
	}

	/**
	 * Get user info from backup
	 */
	private async getUserInfoFromBackup(sessionId: string): Promise<SessionBackupData | null> {
		const userInfoKey = `user_info:${sessionId}`;
		const userInfo = await this.redisClient?.get(userInfoKey);
		return userInfo ? JSON.parse(userInfo) : null;
	}

	/**
	 * Store enough session context to log the expiration after Redis removes the session key.
	 */
	async backupActiveSession(req: Request): Promise<void> {
		try {
			if (!this.redisClient) {
				this.redisClient = await connect(process.env['REDIS_URL'] || '');
			}

			const userId = req.user?._id?.toString();
			const username = req.user?.username;
			const role = req.user?.role;

			if (!req.sessionID || !userId || !username || !role) {
				return;
			}

			const maxAge = req.session?.cookie?.maxAge;
			const ttlSeconds = Math.max(Math.ceil((typeof maxAge === 'number' ? maxAge : 0) / 1000) + 360, 360);

			await this.backupUserInfo(
				req.sessionID,
				{
					userId,
					username,
					role,
					ip: req.session.ip,
					userAgent: req.session.userAgent,
					loginTime: req.session.loginTime ? new Date(req.session.loginTime).toISOString() : undefined,
					lastActivity: req.session.lastActivity
						? new Date(req.session.lastActivity).toISOString()
						: undefined,
					isRemembered: req.session.isRemembered?.toString() || 'false'
				},
				ttlSeconds
			);
		} catch (error) {
			console.error('Error backing up active session for expiration logging:', error);
		}
	}

	/**
	 * Clean up user info backup
	 */
	private async cleanupUserInfoBackup(sessionId: string) {
		const userInfoKey = `user_info:${sessionId}`;
		await this.redisClient?.del(userInfoKey);
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

						// Try to get user data from userId first, then fallback to passport.user
						const userId = sessionWithUser.userId || sessionWithUser.passport?.user;
						if (userId) {
							const user = await User.findById(userId);
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
							ip: sessionWithUser.ip,
							userAgent: sessionWithUser.userAgent,
							loginTime: sessionWithUser.loginTime,
							lastActivity: sessionWithUser.lastActivity,
							isRemembered: sessionWithUser.isRemembered
						};
					})
				);

				resolve(sessionsWithUserData);
			});
		});
	}

	/**
	 * Retrieves filtered session data for public API responses
	 * Returns only safe, non-sensitive information suitable for client consumption
	 * Only returns sessions that have meaningful data (not undefined values)
	 *
	 * @returns Promise<FilteredSessionData[]> Array of filtered session data
	 */
	async getFilteredSessions(): Promise<FilteredSessionData[]> {
		const allSessions = await this.getAllSessions();

		// Filter out sessions that don't have meaningful data
		const validSessions = allSessions.filter((session) => {
			// Check if session has at least some meaningful data
			return session.user || session.ip || session.userAgent || session.loginTime || session.lastActivity;
		});

		return validSessions.map((session) => {
			// Format session ID to show only the Bearer token format
			const sessionId = session.session_id ? `Bearer ${session.session_id}` : '';

			return {
				session_id: sessionId,
				user: session.user
					? {
							username: session.user.username,
							role: session.user.role
						}
					: undefined,
				ip: session.ip,
				userAgent: session.userAgent,
				loginTime: session.loginTime,
				lastActivity: session.lastActivity
			};
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
	 * Update TTL (time-to-live) for all active sessions
	 * This applies the new session timeout to all existing sessions
	 *
	 * @param newTimeoutMs - New timeout value in milliseconds
	 * @returns Promise<{updated: number, failed: number}> Count of updated and failed sessions
	 */
	async updateAllSessionsTTL(newTimeoutMs: number): Promise<{ updated: number; failed: number }> {
		let updated = 0;
		let failed = 0;

		try {
			if (!this.redisClient) {
				this.redisClient = await connect(process.env['REDIS_URL'] || '');
			}

			// Get all session keys from Redis
			const sessionKeys = await this.redisClient.keys('Bearer *');
			const newTTLSeconds = Math.floor(newTimeoutMs / 1000);

			for (const key of sessionKeys) {
				try {
					// Get current TTL
					const currentTTL = await this.redisClient.ttl(key);

					// Only update if session is still active (TTL > 0) and new TTL is shorter
					if (currentTTL > 0) {
						// Apply new TTL - use the minimum of current remaining time and new timeout
						// This ensures sessions don't get extended, only shortened if needed
						const effectiveTTL = Math.min(currentTTL, newTTLSeconds);
						await this.redisClient.expire(key, effectiveTTL);
						updated++;
					}
				} catch (err) {
					console.error(`Failed to update TTL for session ${key}:`, err);
					failed++;
				}
			}

			Logger.info('Updated session TTLs', {
				type: 'session',
				action: 'update_all_ttl',
				details: {
					newTimeoutMs,
					newTTLSeconds,
					updated,
					failed,
					totalSessions: sessionKeys.length
				}
			});

			return { updated, failed };
		} catch (error) {
			Logger.error('Failed to update all session TTLs', {
				type: 'session',
				action: 'update_all_ttl',
				details: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
			return { updated, failed };
		}
	}

	/**
	 * Update TTL (time-to-live) for a specific session
	 * This applies the new session timeout to a single session immediately
	 *
	 * @param sessionId - The session ID to update (without 'Bearer ' prefix)
	 * @param newTimeoutMs - New timeout value in milliseconds
	 * @returns Promise<boolean> True if session TTL was updated successfully
	 */
	async updateSessionTTL(sessionId: string, newTimeoutMs: number): Promise<boolean> {
		try {
			if (!this.redisClient) {
				this.redisClient = await connect(process.env['REDIS_URL'] || '');
			}

			const key = `Bearer ${sessionId}`;
			const newTTLSeconds = Math.floor(newTimeoutMs / 1000);

			// Get current TTL
			const currentTTL = await this.redisClient.ttl(key);

			// Only update if session is still active (TTL > 0)
			if (currentTTL > 0) {
				// Apply new TTL - use the minimum of current remaining time and new timeout
				// This ensures sessions don't get extended, only shortened if needed
				const effectiveTTL = Math.min(currentTTL, newTTLSeconds);
				await this.redisClient.expire(key, effectiveTTL);

				Logger.info('Updated session TTL', {
					type: 'session',
					action: 'update_session_ttl',
					details: {
						sessionId,
						newTimeoutMs,
						newTTLSeconds,
						previousTTL: currentTTL,
						effectiveTTL
					}
				});

				return true;
			}

			return false;
		} catch (error) {
			Logger.error('Failed to update session TTL', {
				type: 'session',
				action: 'update_session_ttl',
				details: {
					sessionId,
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
			return false;
		}
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

// Export a function to get the singleton instance
export const getSessionManager = () => SessionManager.getInstance();

// Export types for external use
export type { SessionWithUserData, FilteredSessionData };
