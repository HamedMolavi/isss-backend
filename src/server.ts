import express, { Application, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import logger from 'morgan';
import connect from "./db/connectMongo";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import flash from 'connect-flash';
import setUpPassport from "./tools/setuppassport";
import passport from 'passport';
import routes from './routes/index.Routes';
import { createStream } from 'rotating-file-stream';
import errorMiddleware from './error/error.middleware';
import { util } from 'chai';

//initial file .env
dotenv.config();

export const dbUri = process.env["MONGODB_URL"] as string;

//export default function server() {

//read key and cert from files for certificate in https server
const key = fs.readFileSync(__dirname + '/../security/sslconfig/key.pem', 'utf-8');
const cert = fs.readFileSync(__dirname + '/../security/sslconfig/cert.pem', 'utf-8');
const options = {
    key: key,
    cert: cert
};

const PORT_HTTP = process.env["PORT_http"] as number | undefined;
const PORT_HTTPS = process.env["PORT_https"] as number | undefined;
const HOST = process.env["HOST"] as string | undefined;

//create express app
const app: Application = express();

//connect to database
connect();

setUpPassport();
//config server
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: "TKRv0IJs=HYqrvagQ#&!F!%V]Ww/4KiVs$s,<<MX",
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//add logger
app.use(logger(process.env.REQUEST_LOG_FORMAT as string));
//add logger in file
app.use(logger(process.env.REQUEST_LOG_FORMAT || 'dev', {
    stream: process.env.REQUEST_LOG_FILE ?
        createStream(process.env.REQUEST_LOG_FILE, {
            size: '10M', // rotate every 10 MegaBytes written
            interval: '1d', // rotate daily
            compress: 'gzip' // compress rotated files
        })
        : process.stdout
}));

//create route for test
app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        message: 'Application works!'
    });
});


//add routes app
app.use("/api/v1", routes);

//add error handler
app.use(errorMiddleware);
//for get unhandeled error in express
process.on('uncaughtException', function (err) {
    console.error(`I've crashed!!! - ${(err.stack || err)}`);
});
//for get unhandeled rejection in express
process.on('unhandledRejection', (reason, p) => {
    console.error(`Unhandled Rejection at: ${util.inspect(p)} reason: ${reason}`);
});

//run https server on port 4000
https.createServer(options, app).listen(PORT_HTTPS, () => {
    console.log(`Server is running on https://${HOST}:${PORT_HTTPS}`);
});

//run http server on port 3000
http.createServer(app).listen(PORT_HTTP, () => {
    console.log(`Server is running on http://${HOST}:${PORT_HTTP}`);
});

// app.listen(3000, () => {
//     console.log('Application started on http://localhost:3000');
// });


export default app;