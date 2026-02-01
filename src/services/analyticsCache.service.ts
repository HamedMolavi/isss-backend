import { RedisClientType, createClient } from 'redis';
import { Logger } from '../logger';

interface CacheMetadata {
	lastUpdated: string;
	isRefreshing: boolean;
	requestParams: string;
}

interface CachedAnalyticsData {
	data: unknown;
	metadata: CacheMetadata;
}

export class AnalyticsCacheService {
	private client: RedisClientType | null = null;
	private logger: Logger;
	private isConnected: boolean = false;
	private static instance: AnalyticsCacheService | null = null;
	private static initializationPromise: Promise<AnalyticsCacheService> | null = null;

	private constructor() {
		this.logger = new Logger({ serviceName: 'AnalyticsCacheService' });
	}

	public static async getInstance(): Promise<AnalyticsCacheService> {
		if (AnalyticsCacheService.instance && AnalyticsCacheService.instance.isConnected) {
			return AnalyticsCacheService.instance;
		}

		if (AnalyticsCacheService.initializationPromise) {
			return AnalyticsCacheService.initializationPromise;
		}

		AnalyticsCacheService.initializationPromise = AnalyticsCacheService.initialize();
		return AnalyticsCacheService.initializationPromise;
	}

	private static async initialize(): Promise<AnalyticsCacheService> {
		if (!AnalyticsCacheService.instance) {
			AnalyticsCacheService.instance = new AnalyticsCacheService();
		}

		if (!AnalyticsCacheService.instance.isConnected) {
			await AnalyticsCacheService.instance.initializeConnection();
		}

		return AnalyticsCacheService.instance;
	}

	private async initializeConnection(): Promise<void> {
		try {
			const connectionTimeout = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Redis connection timeout after 5 seconds')), 5000);
			});

			const connectToRedis = async () => {
				const client: RedisClientType = createClient({
					url: process.env.REDIS_URL || '',
					socket: {
						connectTimeout: 5000
					}
				});
				await client.connect();
				return client;
			};

			this.client = await Promise.race([connectToRedis(), connectionTimeout]);

			this.client.on('error', (err) => {
				this.logger.error('Redis connection error:', err);
				this.isConnected = false;
			});

			this.client.on('end', () => {
				this.logger.warn('Redis connection ended');
				this.isConnected = false;
			});

			this.isConnected = true;
			this.logger.info('Connected to Redis for analytics caching');
		} catch (error) {
			this.logger.error('Failed to initialize Redis connection:', { error });
			this.isConnected = false;
			throw error;
		}
	}

	private generateCacheKey(endpoint: string, params: Record<string, unknown>): string {
		const sortedParams = Object.keys(params)
			.sort()
			.reduce(
				(acc, key) => {
					acc[key] = params[key];
					return acc;
				},
				{} as Record<string, unknown>
			);

		const paramsString = JSON.stringify(sortedParams);
		return `analytics:${endpoint}:${Buffer.from(paramsString).toString('base64')}`;
	}

	async getCachedData(endpoint: string, params: Record<string, unknown>): Promise<unknown | null> {
		if (!this.isConnected || !this.client) {
			this.logger.warn('Redis not connected, skipping cache lookup');
			return null;
		}

		try {
			const cacheKey = this.generateCacheKey(endpoint, params);
			const cachedData = await this.client.get(cacheKey);

			if (!cachedData) {
				return null;
			}

			const parsedData: CachedAnalyticsData = JSON.parse(cachedData);
			this.logger.info('Cache hit for analytics endpoint', {
				endpoint,
				lastUpdated: parsedData.metadata.lastUpdated
			});

			return parsedData.data;
		} catch (error) {
			this.logger.error('Error retrieving cached analytics data', {
				error: error instanceof Error ? error.message : String(error),
				endpoint
			});
			return null;
		}
	}

	async setCachedData(
		endpoint: string,
		params: Record<string, unknown>,
		data: unknown,
		ttlSeconds: number = 400
	): Promise<void> {
		if (!this.isConnected || !this.client) {
			this.logger.warn('Redis not connected, skipping cache storage');
			return;
		}

		try {
			const cacheKey = this.generateCacheKey(endpoint, params);
			const cachedData: CachedAnalyticsData = {
				data,
				metadata: {
					lastUpdated: new Date().toISOString(),
					isRefreshing: false,
					requestParams: JSON.stringify(params)
				}
			};

			await this.client.setEx(cacheKey, ttlSeconds, JSON.stringify(cachedData));

			this.logger.info('Cached analytics data', {
				endpoint,
				ttlSeconds,
				dataSize: JSON.stringify(data).length
			});
		} catch (error) {
			this.logger.error('Error caching analytics data', {
				error: error instanceof Error ? error.message : String(error),
				endpoint
			});
		}
	}

	async isRefreshing(endpoint: string, params: Record<string, unknown>): Promise<boolean> {
		if (!this.isConnected || !this.client) {
			return false;
		}

		try {
			const cacheKey = this.generateCacheKey(endpoint, params);
			const lockKey = `${cacheKey}:refreshing`;
			const isLocked = await this.client.get(lockKey);
			return isLocked === '1';
		} catch (error) {
			this.logger.error('Error checking refresh status', { error });
			return false;
		}
	}

	async setRefreshing(
		endpoint: string,
		params: Record<string, unknown>,
		isRefreshing: boolean,
		ttlSeconds: number = 60
	): Promise<void> {
		if (!this.isConnected || !this.client) {
			return;
		}

		try {
			const cacheKey = this.generateCacheKey(endpoint, params);
			const lockKey = `${cacheKey}:refreshing`;

			if (isRefreshing) {
				await this.client.setEx(lockKey, ttlSeconds, '1');
			} else {
				await this.client.del(lockKey);
			}
		} catch (error) {
			this.logger.error('Error setting refresh status', { error });
		}
	}

	async invalidateCache(endpoint: string, params: Record<string, unknown>): Promise<void> {
		if (!this.isConnected || !this.client) {
			return;
		}

		try {
			const cacheKey = this.generateCacheKey(endpoint, params);
			await this.client.del(cacheKey);
			this.logger.info('Invalidated cache', { endpoint });
		} catch (error) {
			this.logger.error('Error invalidating cache', { error });
		}
	}

	async getCacheMetadata(endpoint: string, params: Record<string, unknown>): Promise<CacheMetadata | null> {
		if (!this.isConnected || !this.client) {
			return null;
		}

		try {
			const cacheKey = this.generateCacheKey(endpoint, params);
			const cachedData = await this.client.get(cacheKey);

			if (!cachedData) {
				return null;
			}

			const parsedData: CachedAnalyticsData = JSON.parse(cachedData);
			return parsedData.metadata;
		} catch (error) {
			this.logger.error('Error retrieving cache metadata', { error });
			return null;
		}
	}
}

export const getAnalyticsCacheService = () => AnalyticsCacheService.getInstance();
