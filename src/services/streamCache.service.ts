import { RedisClientType } from 'redis';
import { connect } from '../db/redis/connect.database';
import { Logger } from '../logger';

/**
 * Interface for cached stream data
 */
interface CachedStreamData {
	streamName: string;
	camera_id: string;
	start_date: string;
	end_date: string;
	report_id?: string;
	created_at: string;
	expires_at: string;
}

/**
 * Redis service for caching playback streams
 */
export class StreamCacheService {
	private client: RedisClientType | null = null;
	private logger: Logger;
	private isConnected: boolean = false;
	private static instance: StreamCacheService | null = null;
	private static initializationPromise: Promise<StreamCacheService> | null = null;

	private constructor() {
		this.logger = new Logger({ serviceName: 'StreamCacheService' });
	}

	/**
	 * Get the singleton instance of StreamCacheService
	 * Ensures only one instance exists and reuses existing Redis connection
	 */
	public static async getInstance(): Promise<StreamCacheService> {
		if (StreamCacheService.instance && StreamCacheService.instance.isConnected) {
			return StreamCacheService.instance;
		}

		// If initialization is already in progress, wait for it
		if (StreamCacheService.initializationPromise) {
			return StreamCacheService.initializationPromise;
		}

		// Start initialization
		StreamCacheService.initializationPromise = StreamCacheService.initialize();
		return StreamCacheService.initializationPromise;
	}

	/**
	 * Initialize the StreamCacheService singleton with existing Redis connection
	 */
	private static async initialize(): Promise<StreamCacheService> {
		if (!StreamCacheService.instance) {
			StreamCacheService.instance = new StreamCacheService();
		}

		if (!StreamCacheService.instance.isConnected) {
			await StreamCacheService.instance.initializeConnection();
		}

		return StreamCacheService.instance;
	}

	/**
	 * Initialize Redis connection using existing infrastructure
	 */
	private async initializeConnection(): Promise<void> {
		try {
			this.client = await connect(process.env.REDIS_URL || '');

			this.client.on('error', (err) => {
				this.logger.error('Redis connection error:', err);
				this.isConnected = false;
			});

			this.client.on('end', () => {
				this.logger.warn('Redis connection ended');
				this.isConnected = false;
			});

			this.isConnected = true;
			this.logger.info('Connected to Redis for stream caching');
		} catch (error) {
			this.logger.error('Failed to initialize Redis connection:', { error });
			this.isConnected = false;
			throw error;
		}
	}

	/**
	 * Generate cache key for stream data
	 * @param camera_id - Camera ID
	 * @param start_date - Start date string
	 * @param end_date - End date string
	 * @param report_id - Optional report ID
	 * @returns Cache key string
	 */
	private generateCacheKey(
		camera_id: string,
		start_date: string,
		end_date: string,
		report_id?: string
	): string {
		const baseKey = `stream:${camera_id}:${start_date}:${end_date}`;
		return report_id ? `${baseKey}:${report_id}` : baseKey;
	}

	/**
	 * Check if a stream is cached and still valid
	 * @param camera_id - Camera ID
	 * @param start_date - Start date string
	 * @param end_date - End date string
	 * @param report_id - Optional report ID
	 * @returns Cached stream data if available and valid, null otherwise
	 */
	async getCachedStream(
		camera_id: string,
		start_date: string,
		end_date: string,
		report_id?: string
	): Promise<CachedStreamData | null> {
		if (!this.isConnected || !this.client) {
			this.logger.warn('Redis not connected, skipping cache lookup');
			return null;
		}

		try {
			const cacheKey = this.generateCacheKey(camera_id, start_date, end_date, report_id);
			const cachedData = await this.client.get(cacheKey);

			if (!cachedData) {
				return null;
			}

			const streamData: CachedStreamData = JSON.parse(cachedData);

			// Check if stream is still valid (not expired)
			const expiresAt = new Date(streamData.expires_at);
			const now = new Date();

			if (now >= expiresAt) {
				// Stream expired, remove from cache
				await this.removeCachedStream(camera_id, start_date, end_date, report_id);
				this.logger.info('Removed expired stream from cache', { cacheKey });
				return null;
			}

			this.logger.info('Found valid cached stream', { cacheKey, streamName: streamData.streamName });
			return streamData;
		} catch (error) {
			this.logger.error('Error retrieving cached stream', {
				error: error instanceof Error ? error.message : String(error),
				camera_id,
				start_date,
				end_date,
				report_id
			});
			return null;
		}
	}

	/**
	 * Cache stream data with TTL
	 * @param camera_id - Camera ID
	 * @param start_date - Start date string
	 * @param end_date - End date string
	 * @param streamData - Stream data to cache
	 * @param report_id - Optional report ID
	 * @param ttlSeconds - TTL in seconds (default: 30 minutes)
	 */
	async cacheStream(
		camera_id: string,
		start_date: string,
		end_date: string,
		streamData: CachedStreamData,
		report_id?: string,
		ttlSeconds: number = 30 * 60 // 30 minutes
	): Promise<void> {
		if (!this.isConnected || !this.client) {
			this.logger.warn('Redis not connected, skipping cache storage');
			return;
		}

		try {
			const cacheKey = this.generateCacheKey(camera_id, start_date, end_date, report_id);
			const serializedData = JSON.stringify(streamData);

			await this.client.setEx(cacheKey, ttlSeconds, serializedData);

			this.logger.info('Cached stream data', {
				cacheKey,
				streamName: streamData.streamName,
				ttlSeconds
			});
		} catch (error) {
			this.logger.error('Error caching stream data', {
				error: error instanceof Error ? error.message : String(error),
				camera_id,
				start_date,
				end_date,
				report_id
			});
		}
	}

	/**
	 * Remove cached stream data
	 * @param camera_id - Camera ID
	 * @param start_date - Start date string
	 * @param end_date - End date string
	 * @param report_id - Optional report ID
	 */
	async removeCachedStream(
		camera_id: string,
		start_date: string,
		end_date: string,
		report_id?: string
	): Promise<void> {
		if (!this.isConnected || !this.client) {
			return;
		}

		try {
			const cacheKey = this.generateCacheKey(camera_id, start_date, end_date, report_id);
			await this.client.del(cacheKey);
			this.logger.info('Removed cached stream', { cacheKey });
		} catch (error) {
			this.logger.error('Error removing cached stream', {
				error: error instanceof Error ? error.message : String(error),
				camera_id,
				start_date,
				end_date,
				report_id
			});
		}
	}
}

// Export helper function to get singleton instance
export const getStreamCacheService = () => StreamCacheService.getInstance();
