"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
//get string connection from enviroment variable
const dbUri = process.env["REDIS_URL"];
//create redis client
const client = (0, redis_1.createClient)({ url: dbUri });
client.connect().then(() => {
    console.log('Connected to Redis');
}).catch(err => {
    console.log('Redis Connection : ' + err);
});
// //connect to redis
// client.on('connect', function () {
//     console.log('Redis client connected');
// });
// //error connect to redis
// client.on('error', (err: any) => {
//     console.log(err);
// });
exports.default = client;
