import logger from "morgan";
import { NextFunction, Request, Response } from "express";
import rfs = require("rotating-file-stream");
import { isAbsolute, join } from "path";
import { randomUuid } from "../tools/utils.tools";
import { mkdirSync, statSync } from "fs";

logger.token('id', function getId() { // log id
  return randomUuid();
});

export function setupLogger() {

  const middlewares = [
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    logger(":id :user-agent :remote-addr :date[web] :url :method :status"), // log all
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
  ];
  return middlewares;
}