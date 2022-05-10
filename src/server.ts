import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import logger from 'morgan';
import connect from "./db/connect";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import flash from 'connect-flash';
import setUpPassport from "./tools/setuppassport";
import userRoutes from './routes/userRoutes';
import passport from 'passport';
import errorHandler from './error/errorHandler';



//initial file .env
dotenv.config();
//read key and cert from files for certificate in https server
const key = fs.readFileSync(__dirname + '/../security/sslconfig/key.pem', 'utf-8');
const cert = fs.readFileSync(__dirname + '/../security/sslconfig/cert.pem', 'utf-8');
const options = {
    key: key,
    cert: cert
};

export const dbUri = process.env["MONGODB_URL"] as string;
const PORT_HTTP = process.env["PORT_http"] as number | undefined;
const PORT_HTTPS = process.env["PORT_https"] as number | undefined;
const HOST = process.env["HOST"] as string | undefined;

//create express app
const app: Express = express();

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
app.use(logger('dev'));

//connect to database
connect();

//create route for test
app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.send('Application works!');
});
//create route for user
app.use(userRoutes);
//add error handler
app.use(errorHandler);

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
