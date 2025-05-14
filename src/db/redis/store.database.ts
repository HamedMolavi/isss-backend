import RedisStore from 'connect-redis';
import session, { Store } from 'express-session';
import { createClient, RedisClientType } from 'redis';

export default function redisStore(): Store | undefined {
	try {
		// Initialize client.
		let redisClient = createClient({ url: process.env['REDIS_URL'] });
		redisClient.connect();

		// Initialize store.
		return new RedisStore({
			client: redisClient,
			prefix: 'Bearer '
		});
	} catch (error) {
		console.error('Express-session on memory:\n', error);
		return undefined; // "MemoryStore"
	}
}
