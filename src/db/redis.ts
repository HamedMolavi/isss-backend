import { createClient, RedisClientType } from 'redis';

//get string connection from enviroment variable
const dbUri: string = process.env["REDIS_URL"] as string;
//create redis client
const client: RedisClientType = createClient({ url: dbUri });

export default client;
