import logger from "morgan";
import { Request, Response } from "express";

export function setupLogger() {
  return logger((tokens, req: Request, res: Response) => {
    if (process.env["NODE_ENV"] === "development" || res.statusCode >= 400) {
      return JSON.stringify({
        _date: tokens.date,
        url: req.originalUrl,
        query: req.query,
        method: req.method,
        httpVersion: req.httpVersion,
        status: res.statusCode,
        message: res.statusMessage,
      });
    }
  })
}