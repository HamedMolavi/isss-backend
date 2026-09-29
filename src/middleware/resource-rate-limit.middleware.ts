import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { createClient } from 'redis';
import { SecurityLogger } from '../logger/security.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { getClientIP } from '../tools/util.tools';

/**
 * Resource Creation Rate Limiter
 *
 * Prevents race condition attacks by limiting the rate of resource creation
 * (users, cameras, personnel, imports, uploads, and other records) per user/IP.
 *
 * Uses Redis for distributed rate limiting across multiple server instances.
 */

interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
	keyPrefix: string; // Redis key prefix
	message: string; // Error message
}

type ResourceType = string;

const ONE_MINUTE = 60 * 1000;

// Keep the sliding-window update in one Redis operation. Running ZREMRANGEBYSCORE,
// ZCARD and ZADD as separate commands lets concurrent requests all observe the
// same count and pass the limit before any of them records its request.
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_start = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local member = ARGV[4]
local ttl_seconds = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

local request_count = redis.call('ZCARD', key)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local oldest_timestamp = now

if #oldest > 1 then
  oldest_timestamp = tonumber(oldest[2])
end

if request_count >= max_requests then
  return { 0, request_count, oldest_timestamp }
end

redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, ttl_seconds)

if request_count == 0 then
  oldest_timestamp = now
end

return { 1, request_count + 1, oldest_timestamp }
`;

const defaultConfigs: Record<string, RateLimitConfig> = {
	user: {
		windowMs: ONE_MINUTE, // 1 minute
		maxRequests: 5, // 5 users per minute
		keyPrefix: 'rate_limit:user_create:',
		message: 'Too many user creation requests. Please wait before creating more users.'
	},
	camera: {
		windowMs: ONE_MINUTE, // 1 minute
		maxRequests: 10, // 10 cameras per minute
		keyPrefix: 'rate_limit:camera_create:',
		message: 'Too many camera creation requests. Please wait before adding more cameras.'
	},
	personnel: {
		windowMs: ONE_MINUTE, // 1 minute
		maxRequests: 5, // 20 personnel per minute
		keyPrefix: 'rate_limit:personnel_create:',
		message: 'Too many personnel creation requests. Please wait before adding more personnel.'
	},
	default: {
		windowMs: ONE_MINUTE,
		maxRequests: 20,
		keyPrefix: 'rate_limit:resource_create:',
		message: 'Too many resource creation requests. Please wait before creating more records.'
	},
	batch: {
		windowMs: ONE_MINUTE,
		maxRequests: 5,
		keyPrefix: 'rate_limit:batch_create:',
		message: 'Too many batch import requests. Please wait before importing more data.'
	},
	image: {
		windowMs: ONE_MINUTE,
		maxRequests: 10,
		keyPrefix: 'rate_limit:image_create:',
		message: 'Too many image creation requests. Please wait before uploading more images.'
	}
};

/**
 * Redis-based rate limiter for resource creation
 * Uses user ID if authenticated, otherwise falls back to IP
 */
export class ResourceRateLimiter {
	private static redisClientPromise: Promise<ReturnType<typeof createClient>> | null = null;

	static logExceeded(req: Request, resourceType: ResourceType): void {
		try {
			SecurityLogger.rateLimitExceeded(req, `${resourceType}_creation`);
		} catch (error) {
			// Logging is best-effort and must never turn a rejected request into an allowed one.
			console.error(`Failed to log rate limit violation for ${resourceType}:`, error);
		}
	}

	private static async getRedisClient(): Promise<ReturnType<typeof createClient>> {
		if (!this.redisClientPromise) {
			const redisUrl = process.env['REDIS_URL'];
			if (!redisUrl) throw new Error('REDIS_URL is required for resource rate limiting');

			const client = createClient({ url: redisUrl });
			client.on('error', (error) => console.error('Resource rate limit Redis error:', error));

			this.redisClientPromise = client
				.connect()
				.then(() => client)
				.catch((error) => {
					// Permit a later request to retry after a transient connection failure.
					this.redisClientPromise = null;
					throw error;
				});
		}

		return this.redisClientPromise!;
	}

	private static getIdentifier(req: Request): string {
		// Use user ID if authenticated, otherwise use IP
		const user = req.user as { _id?: { toString(): string } } | undefined;
		if (user?._id) {
			return `user:${user._id.toString()}`;
		}
		return `ip:${getClientIP(req) || 'unknown'}`;
	}

	static getConfig(resourceType: ResourceType, customConfig?: Partial<RateLimitConfig>): RateLimitConfig {
		const baseConfig = defaultConfigs[resourceType] ?? {
			...defaultConfigs.default,
			keyPrefix: `rate_limit:${resourceType.replace(/[^a-zA-Z0-9_-]/g, '_')}_create:`,
			message: `Too many ${resourceType} creation requests. Please wait before creating more records.`
		};

		return { ...baseConfig, ...customConfig };
	}

	/**
	 * Create a rate limiter middleware for a specific resource type
	 */
	static createLimiter(resourceType: ResourceType, customConfig?: Partial<RateLimitConfig>) {
		const config = this.getConfig(resourceType, customConfig);

		return async (req: Request, res: Response, next: NextFunction) => {
			const identifier = this.getIdentifier(req);
			const key = `${config.keyPrefix}${identifier}`;

			try {
				const client = await this.getRedisClient();
				const now = Date.now();
				const windowStart = now - config.windowMs;
				const ttlSeconds = Math.ceil(config.windowMs / 1000) + 60;
				const result = (await client.eval(SLIDING_WINDOW_SCRIPT, {
					keys: [key],
					arguments: [
						now.toString(),
						windowStart.toString(),
						config.maxRequests.toString(),
						`${now}:${randomUUID()}`,
						ttlSeconds.toString()
					]
				})) as number[];

				const [allowed, requestCount, oldestTimestamp] = result.map(Number);
				const resetAt = oldestTimestamp + config.windowMs;

				if (!allowed) {
					const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));

					this.logExceeded(req, resourceType);
					res.setHeader('Retry-After', retryAfter);
					res.setHeader('X-RateLimit-Limit', config.maxRequests);
					res.setHeader('X-RateLimit-Remaining', 0);
					res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

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

				// Add rate limit headers
				res.setHeader('X-RateLimit-Limit', config.maxRequests);
				res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - requestCount));
				res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

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
	static async resetLimit(resourceType: ResourceType, identifier: string): Promise<void> {
		try {
			const client = await this.getRedisClient();
			const config = this.getConfig(resourceType);
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
		resourceType: ResourceType,
		identifier: string
	): Promise<{
		requestCount: number;
		limit: number;
		windowMs: number;
		isLimited: boolean;
	}> {
		const config = this.getConfig(resourceType);

		try {
			const client = await this.getRedisClient();
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
				limit: config.maxRequests,
				windowMs: config.windowMs,
				isLimited: false
			};
		}
	}
}

// Pre-configured rate limiters for common use cases
export const userCreationRateLimit = ResourceRateLimiter.createLimiter('user');
export const cameraCreationRateLimit = ResourceRateLimiter.createLimiter('camera');
export const personnelCreationRateLimit = ResourceRateLimiter.createLimiter('personnel');
export const defaultCreationRateLimit = ResourceRateLimiter.createLimiter('default');
export const batchCreationRateLimit = ResourceRateLimiter.createLimiter('batch');
export const imageCreationRateLimit = ResourceRateLimiter.createLimiter('image');
export const accessLevelCreationRateLimit = ResourceRateLimiter.createLimiter('access_level');
export const carCreationRateLimit = ResourceRateLimiter.createLimiter('car');
export const carBrandCreationRateLimit = ResourceRateLimiter.createLimiter('car_brand');
export const departmentCreationRateLimit = ResourceRateLimiter.createLimiter('department');
export const jobTitleCreationRateLimit = ResourceRateLimiter.createLimiter('job_title');
export const logTypeCreationRateLimit = ResourceRateLimiter.createLimiter('log_type');
export const manualLogCreationRateLimit = ResourceRateLimiter.createLimiter('manual_log');
export const notificationCreationRateLimit = ResourceRateLimiter.createLimiter('notification');
export const productCreationRateLimit = ResourceRateLimiter.createLimiter('product');
export const scheduleCreationRateLimit = ResourceRateLimiter.createLimiter('schedule');
export const sectionCreationRateLimit = ResourceRateLimiter.createLimiter('section');

/**
 * Express-rate-limit based fallback (in-memory, for single-instance deployments)
 * Use Redis-based limiter for production multi-instance deployments
 */
export const createExpressRateLimit = (
	resourceType: ResourceType,
	customConfig?: Partial<RateLimitConfig>
) => {
	const config = ResourceRateLimiter.getConfig(resourceType, customConfig);

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
			ResourceRateLimiter.logExceeded(req, resourceType);
			res.status(429).json({
				success: false,
				message: config.message,
				retryAfter: Math.ceil(config.windowMs / 1000)
			});
		}
	});
};

export default ResourceRateLimiter;
