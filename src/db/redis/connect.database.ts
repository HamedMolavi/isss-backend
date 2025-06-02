import { createClient, RedisClientType } from 'redis';

// Configure Redis for session expiration notifications
async function configureSessionExpiration(client: RedisClientType): Promise<void> {
	try {
		// Enable all keyspace notifications including expired events
		await client.configSet('notify-keyspace-events', 'Egx');

		// Verify the configuration
		// await client.configGet('notify-keyspace-events');
		// console.log('Redis keyspace notification config:', config);

		// console.log('Redis configured for session expiration notifications');
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
	const subscriber: RedisClientType = createClient({ url: dbUri });
	await subscriber.connect();

	// Create a separate client for commands within the subscriber
	const commandClient: RedisClientType = createClient({ url: dbUri });
	await commandClient.connect();

	// Configure the command client for session expiration
	await configureSessionExpiration(commandClient);

	// Add command client methods to subscriber
	subscriber.get = commandClient.get.bind(commandClient);
	subscriber.set = commandClient.set.bind(commandClient);
	subscriber.del = commandClient.del.bind(commandClient);

	// Add debug event listeners
	subscriber.on('error', (err) => {
		console.error('Redis subscriber error:', err);
	});

	subscriber.on('connect', () => {
		console.log('Redis subscriber connected');
	});

	subscriber.on('ready', () => {
		console.log('Redis subscriber ready');
	});

	subscriber.on('reconnecting', () => {
		console.log('Redis subscriber reconnecting');
	});

	// console.log('Connected to Redis Subscriber with command capabilities');
	return subscriber;
}

export { connect, connectSubscriber };
export default connect;
