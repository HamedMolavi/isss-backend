import { Router, Request, Response, NextFunction } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { LoginBodyDto } from "../../validation/dto/login.dto";
import {
  assignPassport,
  sendTokenToclient,
} from "../../authentication/authorize.auth";

//router instance
const router: Router = Router();

//api for login user
router.post(
  "",
  dtoValidationMiddleware(LoginBodyDto, {
    skipMissingProperties: true,
    detailedMassage: true,
  }),
  assignPassport,
  sendTokenToclient
);

export default router;
