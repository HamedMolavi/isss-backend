import { createClient, RedisClientType } from 'redis';

// Connect to the database 
async function connect(dbUri: string): Promise<RedisClientType> {
    //create redis client
    const client: RedisClientType = createClient({ url: dbUri });
    //connect to redis
    client.connect().then(() => {
        console.log('Connected to Redis');
    }).catch(err => {
        console.log('Redis Connection : ' + err);
    });
    return client;
};

export default connect;
