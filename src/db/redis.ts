import { createClient, RedisClientType } from 'redis';

//get string connection from enviroment variable
const dbUri: string = process.env["REDIS_URL"] as string;
//create redis client
const client: RedisClientType = createClient({ url: dbUri });
//connect to redis
client.connect().then(() => {
    console.log('Connected to Redis');
}).catch(err => {
    console.log('Redis Connection : ' + err);
});


export default client;