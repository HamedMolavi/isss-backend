import { NextFunction, Request, Response, Router } from "express";
import userConfig from "./config/userConfig.Routes";

import newReport from "./report/new.report"

const router: Router = Router();

//add rotes app
router.use("/config/user", userConfig)

router.use("/newreports", newReport);

/*
*/
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////


export default router;
