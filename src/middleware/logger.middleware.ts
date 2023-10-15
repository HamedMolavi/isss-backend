import logger from "morgan";
import { Request, Response } from "express";
import rfs = require("rotating-file-stream");
import { join } from "path";
import { randomUuid } from "../tools/utils.tools";
import { mkdirSync, statSync } from "fs";

const requestLogDir = join(__dirname, process.env["REQUEST_LOG_DIR"] as string)
// Pre Configs
logger.token('id', function getId() { // log id
  return randomUuid();
});
try {
  statSync(requestLogDir); // log directory exists
} catch (_err) {
  mkdirSync(requestLogDir); // log directory created
};


/*
Creating new tokens
morgan.token('type', function (req, res) { return req.headers['content-type'] })
:date[format]
The available formats are:
  clf for the common log format ("10/Oct/2000:13:55:36 +0000")
  iso for the common ISO 8601 date time format (2000-10-10T13:55:36.000Z)
  web for the common RFC 1123 date time format (Tue, 10 Oct 2000 13:55:36 GMT)
:http-version
:method
:remote-addr
  The remote address of the request. This will use req.ip, otherwise the standard req.connection.remoteAddress value (socket address).
:remote-user
  The user authenticated as part of Basic auth for the request.
:req[header]
:res[header]
:status
:url
:user-agent
*/

// _date: tokens.date,
// url: req.originalUrl,
// query: req.query,
// method: req.method,
// httpVersion: req.httpVersion,
// status: res.statusCode,
// message: res.statusMessage,

export function setupLogger() {
  const deniedLogStream = rfs.createStream('error.log', {
    interval: '1d', // rotate daily
    path: requestLogDir
  });
  const middlewares = [
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    logger(":id :user-agent :remote-addr :date[web] :url :method :status"), // log all
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    logger((tokens, req: Request, res: Response) => {
      return !!process.env["REQUEST_LOG_FORMAT"] ? process.env["REQUEST_LOG_FORMAT"]
        : [
          Date.now(),
          tokens.status(req, res),
          tokens.method(req, res),
          tokens.url(req, res),
          "user id: " + req.user?._id,
          "errors: " + JSON.stringify(req.flash("error")),
          "headers: " + JSON.stringify(req.headers),
          "cookies: " + JSON.stringify(req.cookies),
          "request body: " + JSON.stringify(req.body),
          "query: " + JSON.stringify(req.query),
          "params: " + JSON.stringify(req.params),
          "route: " + JSON.stringify(req.originalUrl),
        ].join('\n\t');
    }, {
      skip: (_req, res) => res.statusCode < 400,
      stream: deniedLogStream,
    }),
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
  ];
  return middlewares;
}