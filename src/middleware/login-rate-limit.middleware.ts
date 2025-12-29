import { Request, Response, NextFunction } from 'express';
import { connect } from '../db/redis/connect.database';
import { AuthLogger } from '../logger/auth.logger';
import { ApiRes } from '../utils/api.response';
import { getSecurityConfig } from '../config/security.config';
import { getClientIP } from '../tools/util.tools';

/**
 * Simple Login Rate Limiter
 */
export class LoginRateLimiter {
	private static async getRedisClient() {
		return await connect(process.env['REDIS_URL']);
	}

	private static async getKey(username: string): Promise<string> {
		const config = await getSecurityConfig();
		return `${config.LOGIN_RATE_LIMIT.REDIS_PREFIX}${username}`;
	}

	/**
	 * Check if user should be blocked
	 */
	static checkRateLimit() {
		return async (req: Request, res: Response, next: NextFunction) => {
			if (req.method !== 'POST' || !req.body.username) {
				return next();
			}

			const username = req.body.username.toLowerCase().trim();
			// Use centralized IP extraction for consistency
			const ip = getClientIP(req) || 'unknown';
			const key = await this.getKey(username);

			try {
				const client = await this.getRedisClient();
				const data = await client.hGetAll(key);

				if (data.blockedUntil && Date.now() < parseInt(data.blockedUntil)) {
					const remainingMinutes = Math.ceil((parseInt(data.blockedUntil) - Date.now()) / (60 * 1000));

					AuthLogger.loginBlocked(req, `Login blocked - too many attempts from ${ip}`, { username });

					return ApiRes(res, {
						status: 429, // Too Many Requests
						msg: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`
					});
				}

				// Store username/ip for later use
				req.loginRateLimit = { username, ip };
				next();
			} catch (error) {
				console.error('Rate limit check error:', error);
				next(); // Allow login on error
			}
		};
	}

	/**
	 * Record login attempt result
	 */
	static recordAttempt() {
		return async (req: Request, res: Response, next: NextFunction) => {
			if (!req.loginRateLimit) {
				// If no rate limit info but login failed, still send error response
				if (req.loginFailed) {
					AuthLogger.loginFailed(req, req.loginFailed.error, req.loginFailed.attemptedCredentials);
					return ApiRes(res, {
						status: 401,
						msg: 'Invalid credentials'
					});
				}
				return next();
			}

			const { username, ip } = req.loginRateLimit;
			const config = await getSecurityConfig();
			const key = await this.getKey(username);
			const historyKey = `${config.LOGIN_RATE_LIMIT.ATTEMPTS_HISTORY_PREFIX}${username}`;
			// Check if login failed via req.loginFailed flag (set by assignPassport)
			const isSuccess = !!req.user && !req.loginFailed;
			const now = Date.now();

			try {
				const client = await this.getRedisClient();

				// Create attempt record
				const attemptRecord = {
					timestamp: now,
					ip: ip,
					success: isSuccess,
					userAgent: req.get('User-Agent') || 'unknown'
				};

				// Store individual attempt in history list
				await client.lPush(historyKey, JSON.stringify(attemptRecord));

				// Set expiration for history (7 days)
				await client.expire(historyKey, config.LOGIN_RATE_LIMIT.HISTORY_RETENTION_DAYS * 24 * 60 * 60);

				// Trim history to keep only last 1000 attempts (prevent unlimited growth)
				await client.lTrim(historyKey, 0, 999);

				if (isSuccess) {
					// Clear rate limit attempts on successful login but keep history
					await client.del(key);
					// Note: logging is handled by assignPassport middleware
				} else {
					// Increment failed attempts
					const attempts = await client.hIncrBy(key, 'attempts', 1);

					// Set first attempt time if not exists
					const firstAttempt = await client.hGet(key, 'firstAttempt');
					if (!firstAttempt) {
						await client.hSet(key, 'firstAttempt', now.toString());
					}

					// Always update the latest IP for logging purposes
					await client.hSet(key, 'latestIP', ip);
					await client.hSet(key, 'lastAttempt', now.toString());

					// Check if should block
					if (attempts >= config.LOGIN_RATE_LIMIT.MAX_ATTEMPTS) {
						const blockUntil = now + config.LOGIN_RATE_LIMIT.BLOCK_DURATION_MINUTES * 60 * 1000;
						await client.hSet(key, 'blockedUntil', blockUntil.toString());

						AuthLogger.loginBlocked(req, `User blocked after ${attempts} failed attempts from ${ip}`, {
							username
						});
					} else {
						AuthLogger.loginFailed(
							req,
							`Failed login attempt ${attempts}/${config.LOGIN_RATE_LIMIT.MAX_ATTEMPTS} from ${ip}`,
							{ username }
						);
					}

					// Set expiration for cleanup
					await client.expire(
						key,
						config.LOGIN_RATE_LIMIT.BLOCK_DURATION_MINUTES * 60 + config.LOGIN_RATE_LIMIT.WINDOW_MINUTES * 60
					);
				}
			} catch (error) {
				console.error('Rate limit record error:', error);
			}

			// If login failed, send error response instead of continuing to next middleware
			if (req.loginFailed) {
				return ApiRes(res, {
					status: 401,
					msg: 'Invalid credentials'
				});
			}

			next();
		};
	}

	/**
	 * Reset rate limit for user (admin function)
	 */
	static async resetUser(username: string): Promise<void> {
		try {
			const client = await this.getRedisClient();
			const key = await this.getKey(username);
			await client.del(key);
		} catch (error) {
			console.error('Reset rate limit error:', error);
		}
	}

	/**
	 * Get rate limit info for a user (admin function)
	 */
	static async getUserInfo(username: string): Promise<{
		attempts: number;
		isBlocked: boolean;
		latestIP?: string;
		blockedUntil?: Date;
		firstAttempt?: Date;
		lastAttempt?: Date;
		allAttempts: Array<{
			timestamp: Date;
			ip: string;
			success: boolean;
			userAgent: string;
		}>;
	}> {
		try {
			const client = await this.getRedisClient();
			const config = await getSecurityConfig();
			const key = await this.getKey(username);
			const historyKey = `${config.LOGIN_RATE_LIMIT.ATTEMPTS_HISTORY_PREFIX}${username}`;

			// Get current rate limit data
			const data = await client.hGetAll(key);

			// Get all attempt history
			const historyData = await client.lRange(historyKey, 0, -1);
			const allAttempts = historyData
				.map((item) => {
					const attempt = JSON.parse(item);
					return {
						timestamp: new Date(attempt.timestamp),
						ip: attempt.ip,
						success: attempt.success,
						userAgent: attempt.userAgent
					};
				})
				.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by newest first

			const isBlocked = data.blockedUntil && Date.now() < parseInt(data.blockedUntil);

			return {
				attempts: parseInt(data.attempts) || 0,
				isBlocked: !!isBlocked,
				latestIP: data.latestIP,
				blockedUntil: data.blockedUntil ? new Date(parseInt(data.blockedUntil)) : undefined,
				firstAttempt: data.firstAttempt ? new Date(parseInt(data.firstAttempt)) : undefined,
				lastAttempt: data.lastAttempt ? new Date(parseInt(data.lastAttempt)) : undefined,
				allAttempts: allAttempts
			};
		} catch (error) {
			console.error('Get user info error:', error);
			return { attempts: 0, isBlocked: false, allAttempts: [] };
		}
	}
}

export default LoginRateLimiter;
