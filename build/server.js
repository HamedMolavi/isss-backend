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
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const connect_flash_1 = __importDefault(require("connect-flash"));
const setuppassport_1 = __importDefault(require("./tools/setuppassport"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const passport_1 = __importDefault(require("passport"));
//initial file .env
dotenv_1.default.config();
//read key and cert from files for certificate in https server
const key = fs_1.default.readFileSync(__dirname + '/../sshconfig/security/key.pem', 'utf-8');
const cert = fs_1.default.readFileSync(__dirname + '/../sshconfig/security/cert.pem', 'utf-8');
const options = {
    key: key,
    cert: cert
};
const PORT_HTTP = process.env["PORT_http"];
const PORT_HTTPS = process.env["PORT_https"];
const HOST = process.env["HOST"];
//create express app
const app = (0, express_1.default)();
(0, setuppassport_1.default)();
//config server
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
app.use((0, express_session_1.default)({
    secret: "TKRv0IJs=HYqrvagQ#&!F!%V]Ww/4KiVs$s,<<MX",
    resave: true,
    saveUninitialized: true
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use((0, connect_flash_1.default)());
//add logger
app.use((0, morgan_1.default)('dev'));
//connect to database
(0, connect_1.default)();
//create route for test
app.get('/', (req, res, next) => {
    res.send('Application works!');
});
app.use(userRoutes_1.default);
//add endpoint for erorr handeling not found page or time-out or ....
app.use((error, req, res, next) => {
    console.log("Error Handling Middleware called");
    console.log('Path: ', req.path);
    console.error('Error: ', error);
    // if (error.type == 'redirect')
    //     res.redirect('/error')
    //  else if (error.type == 'time-out') // arbitrary condition check
    //      res.status(408).send(error)
    if (error.message == 'Not Found') {
        res.status(404);
    }
    else if (error.message == 'Unauthorized') {
        res.status(401);
    }
    else if (error.message == 'Not Authorized') {
        res.status(403);
    }
    else {
        res.status(500);
    }
    res.json({
        errors: {
            message: error.message,
            error: {},
        },
    });
});
//run https server on port 4000
https_1.default.createServer(options, app).listen(PORT_HTTPS, () => {
    console.log(`Server is running on https://${HOST}:${PORT_HTTPS}`);
});
//run http server on port 3000
http_1.default.createServer(app).listen(PORT_HTTP, () => {
    console.log(`Server is running on http://${HOST}:${PORT_HTTP}`);
});
// app.listen(3000, () => {
//     console.log('Application started on http://localhost:3000');
// });
