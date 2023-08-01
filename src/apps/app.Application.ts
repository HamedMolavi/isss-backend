import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import flash from "connect-flash";
import { setUpPassport } from "../setups/passport.setup";
import passport from "passport";
import routes from "../routes/index.Routes";
import fileUpload from "express-fileupload";
import { ApiError } from "../error/error.handler";
import localVarMiddleware from "../setups/localVar.setup";
import { setupLogger } from "../setups/logger.setup";
import { join } from "path";
import redisStore from "../db/redis/store.database";

//create express app
const app: Application = express();
export const sessionMiddleware = session({
  store: redisStore(),
  name: "connect.sid",
  secret: "M<Y$N0A=MHEqIvS,D#E!V!M]OWL/AiV4I",
  resave: false,//if you want to keep the session in case of user activity, set these both to true.
  rolling: false,//if you want to keep the session in case of user activity, set these both to true.
  saveUninitialized: false,
  cookie: {
    maxAge: undefined,
    httpOnly: true,
  },
});
//config server
setUpPassport();

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header('Access-Control-Allow-Methods', 'DELETE, PUT, GET, POST');
//   // res.header("Access-Control-Allow-Credentials", "true");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(bodyParser.text({ limit: "200mb" }));
app.use(fileUpload());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(flash());
app.use(passport.session());

//add logger
app.use(setupLogger());

//local variables setup
app.use(localVarMiddleware);

//app routes
app.use("/api/v1", routes);
app.get("/index", (_req, res) => {
  res.sendFile(join(__dirname, "../clients/socketio.html"))
})

//404 route
app.use(function notFound(req: Request, _res: Response, next: NextFunction) {
  const err = new ApiError(404, `Requested path ${req.path} not found`);
  next(err);
});

//app stack error handler
app.use(function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  console.log(
    "Error in endpoint: ",
    {
      success: false,
      message: err.message,
      stack: err.stack,
    }
  );
  return res.status(statusCode).send({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : "",
  });
});


export default app;

export const setResponseBody = (_req: any, res: any, next: any) => {
  const oldWrite = res.write, oldEnd = res.end, chunks: any = [];
  res.write = function (chunk: any) {
    chunks.push(Buffer.from(chunk));
    oldWrite.apply(res, arguments);
  };
  res.end = function (chunk: any) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    };
    const body = Buffer.concat(chunks).toString("utf8");
    res.__custombody__ = body;
    oldEnd.apply(res, arguments);
  };
  next();
};
