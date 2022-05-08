"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const morgan_1 = __importDefault(require("morgan"));
const connect_1 = __importDefault(require("./db/connect"));
const dotenv_1 = __importDefault(require("dotenv"));
//initial file .env
dotenv_1.default.config();
//read key and cert from files for certificate in https server
const key = fs_1.default.readFileSync(__dirname + '/../tools/security/key.pem', 'utf-8');
const cert = fs_1.default.readFileSync(__dirname + '/../tools/security/cert.pem', 'utf-8');
const options = {
    key: key,
    cert: cert
};
const PORT_HTTP = process.env["PORT_http"];
const PORT_HTTPS = process.env["PORT_https"];
const HOST = process.env["HOST"];
//create express app
const app = (0, express_1.default)();
//add logger
app.use((0, morgan_1.default)('dev'));
//connect to database
(0, connect_1.default)();
//create route for test
app.get('/', (req, res, next) => {
    res.send('Application works!');
});
//add endpoint for erorr handeling not found page or time-out or ....
app.use((error, req, res, next) => {
    console.log("Error Handling Middleware called");
    console.log('Path: ', req.path);
    console.error('Error: ', error);
    // if (error.type == 'redirect')
    //     res.redirect('/error')
    //  else if (error.type == 'time-out') // arbitrary condition check
    //      res.status(408).send(error)
    //  else
    res.status(500).send(error);
});
//run https server on port 4000
https_1.default.createServer(options, app).listen(PORT_HTTPS, () => {
    console.log(`Server is running on http://${HOST}:${PORT_HTTPS}`);
});
//run http server on port 3000
http_1.default.createServer(app).listen(PORT_HTTP, () => {
    console.log(`Server is running on http://${HOST}:${PORT_HTTP}`);
});
// app.listen(3000, () => {
//     console.log('Application started on http://localhost:3000');
// });
