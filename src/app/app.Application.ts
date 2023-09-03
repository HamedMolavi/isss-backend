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
import { ApiError } from "../types/classes/error.class";
import localVarMiddleware from "../middleware/localVar.middleware";
import { setupLogger } from "../middleware/logger.middleware";
import redisStore from "../db/redis/store.database";
<<<<<<< Updated upstream:src/app/app.Application.ts
import { authHeaderExtraction, sessionMiddleware } from "../authentication/authorize.auth";
=======
<<<<<<< Updated upstream:src/apps/app.Application.ts
import { authHeaderExtraction } from "../authentication/authorize.auth";
=======
import middlewares from "../middleware/index";
>>>>>>> Stashed changes:src/app/app.Application.ts
>>>>>>> Stashed changes:src/apps/app.Application.ts

//create express app
const app: Application = express();

<<<<<<< Updated upstream:src/apps/app.Application.ts
///////////////////////////////////////////////////////////////////////////////// Credentials

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
app.use([
  cookieParser(),
  authHeaderExtraction,
  sessionMiddleware,
  passport.initialize(),
  passport.session(),
]);
///////////////////////////////////////////////////////////////////////////////// Parsing & Logger
app.use(
  bodyParser.json({ limit: "50mb" }),
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  }),
  bodyParser.text({ limit: "200mb" }),
  fileUpload(),
  flash(),
  setupLogger(),
  localVarMiddleware, //local variables setup
);
=======
///////////////////////////////////////////////////////////////////////////////// middlewares
app.use(middlewares);
>>>>>>> Stashed changes:src/app/app.Application.ts

///////////////////////////////////////////////////////////////////////////////// Routing
//app routes
app.use("/api/v1", routes);

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