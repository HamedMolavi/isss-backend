import express, { Application, NextFunction, Request, Response } from "express";
import routes from "../routes/index.Routes";
import { ApiError } from "../types/classes/error.class";
import { ErrorRequestHandler } from 'express';
import middlewares from "../middleware/index";

//create express app
const app: Application = express();
app.set('json limit', '600mb');

// Health check route
app.get('/api/v1/healthcheck', (req, res) => {
  res.status(200).send('OK');
});
///////////////////////////////////////////////////////////////////////////////// middlewares
app.use(middlewares);

///////////////////////////////////////////////////////////////////////////////// Routing
//app routes
app.use("/api/v1", routes);

//404 route
app.use(function notFound(req: Request, _res: Response, next: NextFunction) {
  const err = new ApiError(404, `Requested path ${req.path} not found`);
  next(err);
});



const errorHandler: ErrorRequestHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  if (err.message !== "File not found") {
    console.log("Error in endpoint: ", {
      success: false,
      message: err.message,
      stack: err.stack,
    });
  }
  res.status(statusCode).send({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : "",
  });
};
//app stack error handler
app.use(errorHandler)

export default app;
