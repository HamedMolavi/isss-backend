import { NextFunction, Request, Response, Router } from "express";
import userConfig from "./config/userConfig.Routes";
import newReport from "./report/new.report"
import login from "./auth/login.Routes";
import { passportGate } from "../authentication/authorize.auth";

const router: Router = Router();

router.use("/auth/login", login);
router.use(passportGate);
router.use("/config/user", userConfig)

router.use("/newreports", newReport);

/*
*/
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////


export default router;
