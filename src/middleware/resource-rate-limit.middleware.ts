import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { connect } from '../db/redis/connect.database';
import { SecurityLogger } from '../logger/security.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { getClientIP } from '../tools/util.tools';

/**
 * Resource Creation Rate Limiter
 *
 * Prevents race condition attacks by limiting the rate of resource creation
 * (users, cameras, personnel) per user/IP.
 *
 * Uses Redis for distributed rate limiting across multiple server instances.
 */

interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
	keyPrefix: string; // Redis key prefix
	message: string; // Error message
}

const defaultConfigs: Record<string, RateLimitConfig> = {
	user: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 5, // 5 users per minute
		keyPrefix: 'rate_limit:user_create:',
		message: 'Too many user creation requests. Please wait before creating more users.'
	},
	camera: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 10, // 10 cameras per minute
		keyPrefix: 'rate_limit:camera_create:',
		message: 'Too many camera creation requests. Please wait before adding more cameras.'
	},
	personnel: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 20, // 20 personnel per minute
		keyPrefix: 'rate_limit:personnel_create:',
		message: 'Too many personnel creation requests. Please wait before adding more personnel.'
	}
};

/**
 * Redis-based rate limiter for resource creation
 * Uses user ID if authenticated, otherwise falls back to IP
 */
export class ResourceRateLimiter {
	private static async getRedisClient() {
		return await connect(process.env['REDIS_URL']);
	}

	private static getIdentifier(req: Request): string {
		// Use user ID if authenticated, otherwise use IP
		const user = req.user as { _id?: { toString(): string } } | undefined;
		if (user?._id) {
			return `user:${user._id.toString()}`;
		}
		return `ip:${getClientIP(req) || 'unknown'}`;
	}

	/**
	 * Create a rate limiter middleware for a specific resource type
	 */
	static createLimiter(
		resourceType: 'user' | 'camera' | 'personnel',
		customConfig?: Partial<RateLimitConfig>
	) {
		const config = { ...defaultConfigs[resourceType], ...customConfig };

		return async (req: Request, res: Response, next: NextFunction) => {
			const identifier = this.getIdentifier(req);
			const key = `${config.keyPrefix}${identifier}`;

			try {
				const client = await this.getRedisClient();
				const now = Date.now();
				const windowStart = now - config.windowMs;

				// Remove old entries outside the window
				await client.zRemRangeByScore(key, 0, windowStart);

				// Count requests in current window
				const requestCount = await client.zCard(key);

				if (requestCount >= config.maxRequests) {
					// Get the oldest request timestamp to calculate retry time
					const oldestRequests = await client.zRange(key, 0, 0);
					let retryAfter = Math.ceil(config.windowMs / 1000);

					if (oldestRequests.length > 0) {
						const oldestTimestamp = parseInt(oldestRequests[0]);
						retryAfter = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);
					}

					SecurityLogger.rateLimitExceeded(req, `${resourceType}_creation`);

					return ApiRes(res, {
						status: HttpStatus.TOO_MANY_REQUESTS,
						msg: config.message,
						data: {
							retryAfter,
							limit: config.maxRequests,
							windowMs: config.windowMs
						}
					});
				}

				// Add current request to the sorted set
				await client.zAdd(key, { score: now, value: now.toString() });

				// Set expiration for cleanup
				await client.expire(key, Math.ceil(config.windowMs / 1000) + 60);

				// Add rate limit headers
				res.setHeader('X-RateLimit-Limit', config.maxRequests);
				res.setHeader('X-RateLimit-Remaining', config.maxRequests - requestCount - 1);
				res.setHeader('X-RateLimit-Reset', Math.ceil((now + config.windowMs) / 1000));

				next();
			} catch (error) {
				console.error(`Rate limit check error for ${resourceType}:`, error);
				// Allow request on Redis error to prevent service disruption
				next();
			}
		};
	}

	/**
	 * Reset rate limit for a specific identifier (admin function)
	 */
	static async resetLimit(resourceType: 'user' | 'camera' | 'personnel', identifier: string): Promise<void> {
		try {
			const client = await this.getRedisClient();
			const config = defaultConfigs[resourceType];
			const key = `${config.keyPrefix}${identifier}`;
			await client.del(key);
		} catch (error) {
			console.error('Reset rate limit error:', error);
		}
	}

	/**
	 * Get rate limit info for a specific identifier (admin function)
	 */
	static async getLimitInfo(
		resourceType: 'user' | 'camera' | 'personnel',
		identifier: string
	): Promise<{
		requestCount: number;
		limit: number;
		windowMs: number;
		isLimited: boolean;
	}> {
		try {
			const client = await this.getRedisClient();
			const config = defaultConfigs[resourceType];
			const key = `${config.keyPrefix}${identifier}`;
			const now = Date.now();
			const windowStart = now - config.windowMs;

			// Remove old entries and count current
			await client.zRemRangeByScore(key, 0, windowStart);
			const requestCount = await client.zCard(key);

			return {
				requestCount,
				limit: config.maxRequests,
				windowMs: config.windowMs,
				isLimited: requestCount >= config.maxRequests
			};
		} catch (error) {
			console.error('Get rate limit info error:', error);
			return {
				requestCount: 0,
				limit: defaultConfigs[resourceType].maxRequests,
				windowMs: defaultConfigs[resourceType].windowMs,
				isLimited: false
			};
		}
	}
}

// Pre-configured rate limiters for common use cases
export const userCreationRateLimit = ResourceRateLimiter.createLimiter('user');
export const cameraCreationRateLimit = ResourceRateLimiter.createLimiter('camera');
export const personnelCreationRateLimit = ResourceRateLimiter.createLimiter('personnel');

/**
 * Express-rate-limit based fallback (in-memory, for single-instance deployments)
 * Use Redis-based limiter for production multi-instance deployments
 */
export const createExpressRateLimit = (
	resourceType: 'user' | 'camera' | 'personnel',
	customConfig?: Partial<RateLimitConfig>
) => {
	const config = { ...defaultConfigs[resourceType], ...customConfig };

	return rateLimit({
		windowMs: config.windowMs,
		max: config.maxRequests,
		message: {
			success: false,
			message: config.message,
			retryAfter: Math.ceil(config.windowMs / 1000)
		},
		standardHeaders: true,
		legacyHeaders: false,
		handler: (req: Request, res: Response) => {
			SecurityLogger.rateLimitExceeded(req, `${resourceType}_creation`);
			res.status(429).json({
				success: false,
				message: config.message,
				retryAfter: Math.ceil(config.windowMs / 1000)
			});
		}
	});
};

export default ResourceRateLimiter;
