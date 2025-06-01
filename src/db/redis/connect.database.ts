import { createClient, RedisClientType } from 'redis';

// Configure Redis for session expiration notifications
async function configureSessionExpiration(client: RedisClientType): Promise<void> {
	try {
		await client.configSet('notify-keyspace-events', 'Ex');
		console.log('Redis configured for session expiration notifications');
	} catch (err) {
		console.error('Failed to configure Redis for session expiration:', err);
		throw err;
	}
}

// Connect to the database for regular commands
async function connect(dbUri: string): Promise<RedisClientType> {
	const client: RedisClientType = createClient({ url: dbUri });
	await client.connect();
	console.log('Connected to Redis');
	await configureSessionExpiration(client);
	return client;
}

// Connect to the database for PubSub
async function connectSubscriber(dbUri: string): Promise<RedisClientType> {
	const client: RedisClientType = createClient({ url: dbUri });
	await client.connect();
	console.log('Connected to Redis Subscriber');
	return client;
}

export { connect, connectSubscriber };
export default connect;
