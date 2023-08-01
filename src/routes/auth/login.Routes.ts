import { Router, Request, Response, NextFunction } from "express";
import { dtoValidationMiddleware } from "../../validation/dto";
import { LoginBodyDto } from "../../validation/dto/login.dto";
import { assignPassport } from "../../authentication/authorize.auth";

//router instance
const router: Router = Router();

//api for login user
router.post("",
  dtoValidationMiddleware(LoginBodyDto, { skipMissingProperties: true }),
  assignPassport,
  function (req: Request, res: Response) {
    console.log(req.sessionID);
    return res.status(200).json({
      success: true,
      data: { ...req.user, token: req.sessionID },
    });
  });


export default router;
