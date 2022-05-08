"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
//read key and cert from files for certificate in https server
const key = fs_1.default.readFileSync(__dirname + '/../tools/security/key.pem', 'utf-8');
const cert = fs_1.default.readFileSync(__dirname + '/../tools/security/cert.pem', 'utf-8');
const options = {
    key: key,
    cert: cert
};
//create express app
const app = (0, express_1.default)();
//create route for test
app.get('/', (req, res) => {
    res.send('Application works!');
});
//run https server on port 4000
https_1.default.createServer(options, app).listen(4000, () => {
    console.log('Server is running on https://localhost:4000');
});
//run http server on port 3000
http_1.default.createServer(app).listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
// app.listen(3000, () => {
//     console.log('Application started on http://localhost:3000');
// });
