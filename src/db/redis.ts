import { createClient, RedisClientType } from 'redis';

//get string connection from enviroment variable
const dbUri: string = process.env["REDIS_URL"] as string;
//create redis client
const client: RedisClientType = createClient({ url: dbUri });

client.connect();
//connect to redis
client.on('connect', function () {
    console.log('Redis client connected');
});
//error connect to redis
client.on('error', (err: any) => {
    console.log(err);
});

export default client;
