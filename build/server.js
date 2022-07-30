"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbUri = void 0;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const morgan_1 = __importDefault(require("morgan"));
const connectMongo_1 = __importDefault(require("./db/connectMongo"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const connect_flash_1 = __importDefault(require("connect-flash"));
const setuppassport_1 = __importDefault(require("./tools/setuppassport"));
const passport_1 = __importDefault(require("passport"));
const index_Routes_1 = __importDefault(require("./routes/index.Routes"));
const rotating_file_stream_1 = require("rotating-file-stream");
const chai_1 = require("chai");
//initial file .env
dotenv_1.default.config();
exports.dbUri = process.env["MONGODB_URL"];
//export default function server() {
//read key and cert from files for certificate in https server
const key = fs_1.default.readFileSync(__dirname + "/../security/sslconfig/key.pem", "utf-8");
const cert = fs_1.default.readFileSync(__dirname + "/../security/sslconfig/cert.pem", "utf-8");
const options = {
    key: key,
    cert: cert,
};
const PORT_HTTP = process.env["PORT_http"];
const PORT_HTTPS = process.env["PORT_https"];
const HOST = process.env["HOST"];
//create express app
const app = (0, express_1.default)();
//connect to database
(0, connectMongo_1.default)();
(0, setuppassport_1.default)();
//config server
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
app.use((0, express_session_1.default)({
    secret: "TKRv0IJs=HYqrvagQ#&!F!%V]Ww/4KiVs$s,<<MX",
    resave: true,
    saveUninitialized: true,
}));
app.use(passport_1.default.session());
app.use((0, connect_flash_1.default)());
//add logger
//app.use(logger(process.env.REQUEST_LOG_FORMAT as string));
//add logger in file
app.use((0, morgan_1.default)(process.env.REQUEST_LOG_FORMAT || "dev", {
    stream: process.env.REQUEST_LOG_FILE
        ? (0, rotating_file_stream_1.createStream)(process.env.REQUEST_LOG_FILE, {
            size: "10M",
            interval: "1d",
            compress: "gzip", // compress rotated files
        })
        : process.stdout,
}));
//create route for test
app.get("/", (req, res, next) => {
    res.status(200).json({
        message: "Application works!",
    });
});
//add routes app
app.use("/api/v1", index_Routes_1.default);
//for get unhandeled error in express
process.on("uncaughtException", function (err) {
    console.error(`I've crashed!!! - ${err.stack || err}`);
});
//for get unhandeled rejection in express
process.on("unhandledRejection", (reason, p) => {
    console.error(`Unhandled Rejection at: ${chai_1.util.inspect(p)} reason: ${reason}`);
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
exports.default = app;
