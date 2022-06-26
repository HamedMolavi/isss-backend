"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
//get string connection from enviroment variable
const dbUri = process.env["REDIS_URL"];
//create redis client
const client = (0, redis_1.createClient)({ url: dbUri });
//connect to redis
client.connect().then(() => {
    console.log('Connected to Redis');
}).catch(err => {
    console.log('Redis Connection : ' + err);
});
exports.default = client;
