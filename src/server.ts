import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import logger from 'morgan';
import connect from "./db/connect";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import flash from 'connect-flash';
import setUpPassport from "./tools/setuppassport";
import routes from './routes/userRoutes';
import passport from 'passport';

//initial file .env
dotenv.config();
//read key and cert from files for certificate in https server
const key = fs.readFileSync(__dirname + '/../tools/security/key.pem', 'utf-8');
const cert = fs.readFileSync(__dirname + '/../tools/security/cert.pem', 'utf-8');
const options = {
    key: key,
    cert: cert
};

const PORT_HTTP = process.env["PORT_http"] as number | undefined;
const PORT_HTTPS = process.env["PORT_https"] as number | undefined;
const HOST = process.env["HOST"] as string | undefined;

//create express app
const app: Express = express();

//config server
app.use(cors());
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

setUpPassport();

//create route for test
app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.send('Application works!');
});

app.use(routes);

//add endpoint for erorr handeling not found page or time-out or ....
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.log("Error Handling Middleware called")
    console.log('Path: ', req.path)
    console.error('Error: ', error)

    // if (error.type == 'redirect')
    //     res.redirect('/error')

    //  else if (error.type == 'time-out') // arbitrary condition check
    //      res.status(408).send(error)
    //  else
    res.status(500);
    res.json({
        errors: {
            message: error.message,
            error: {},
        },
    });
})

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