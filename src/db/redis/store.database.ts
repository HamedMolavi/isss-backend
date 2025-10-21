import RedisStore from 'connect-redis';
import { Store } from 'express-session';
import { createClient } from 'redis';

export default function redisStore(): Store | undefined {
	try {
		// Initialize client.
		const redisClient = createClient({
			url: process.env['REDIS_URL'],
			socket: {
				connectTimeout: 10000
			}
		});

		// Add error handling for Redis client
		redisClient.on('error', (err) => {
			console.error('Redis session store client error:', err);
		});

		redisClient.on('connect', () => {
			console.log('Redis session store connected');
		});

		redisClient.on('reconnecting', () => {
			console.log('Redis session store reconnecting');
		});

		redisClient.on('end', () => {
			console.log('Redis session store disconnected');
		});

		// Connect to Redis with proper error handling
		redisClient.connect().catch((err) => {
			console.error('Failed to connect Redis session store:', err);
		});

		// Initialize store with better configuration
		return new RedisStore({
			client: redisClient,
			prefix: 'Bearer ',
			ttl: 1800, // 30 minutes in seconds
			disableTouch: false, // Allow touch to reset TTL
			disableTTL: false // Enable TTL
		});
	} catch (error) {
		console.error('Express-session fallback to memory store:\n', error);
		return undefined; // Falls back to MemoryStore
	}
}
