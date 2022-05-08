import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import logger from 'morgan';
import connect from "./db/connect";
import dotenv from "dotenv";

//initial file .env
dotenv.config();
//read key and cert from files for certificate in https server
const key = fs.readFileSync(__dirname + '/../tools/security/key.pem', 'utf-8');
const cert = fs.readFileSync(__dirname + '/../tools/security/cert.pem', 'utf-8');
const options = {
    key: key,
    cert: cert
};

const PORT_HTTP = process.env["PORT_http"];
const PORT_HTTPS = process.env["PORT_https"];
const HOST = process.env["HOST"];

//create express app
const app: Express = express();

//add logger
app.use(logger('dev'));

//connect to database
connect();

//create route for test
app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.send('Application works!');
});

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
    res.status(500).send(error)
})

//run https server on port 4000
https.createServer(options, app).listen(PORT_HTTPS, () => {
    console.log(`Server is running on http://${HOST}:${PORT_HTTPS}`);
});

//run http server on port 3000
http.createServer(app).listen(PORT_HTTP, () => {
    console.log(`Server is running on http://${HOST}:${PORT_HTTP}`);
});

// app.listen(3000, () => {
//     console.log('Application started on http://localhost:3000');
// });