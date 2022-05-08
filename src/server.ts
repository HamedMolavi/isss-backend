import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import logger from 'morgan';

//read key and cert from files for certificate in https server
const key = fs.readFileSync(__dirname + '/../tools/security/key.pem', 'utf-8');
const cert = fs.readFileSync(__dirname + '/../tools/security/cert.pem', 'utf-8');
const options = {
    key: key,
    cert: cert
};

//create express app
const app: Express = express();

//add logger
app.use(logger('dev'));

//create route for test
app.get('/', (req: Request, res: Response, next: NextFunction) => {
    //res.send('Application works!');
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
https.createServer(options, app).listen(4000, () => {
    console.log('Server is running on https://localhost:4000');
});

//run http server on port 3000
http.createServer(app).listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// app.listen(3000, () => {
//     console.log('Application started on http://localhost:3000');
// });