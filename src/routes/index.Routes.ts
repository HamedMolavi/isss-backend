import { NextFunction, Request, Response, Router } from "express";
import userConfig from "./config/userConfig.Routes";
import adminConfig from "./config/adminConfig.Routes";
import login from "./auth/login.Routes";


import downloadVideo from "./report/videoDownload.Routes";
import report from "./report/report.Routes";
import newReport from "./report/new.report"
import schedulesreport from "./report/schedulesReport.Routes";
import reportDepartments from "./report/departmentReport.Routes";

import { passportGate } from "../authentication/authorize.auth";
import { recordLastOperation } from "../middleware/userOperations.middleware";

const router: Router = Router();

//routes in which verification is not needed
router.use("/auth/login", login);

//middleware for check and verify token
router.use(passportGate);
router.use(recordLastOperation);



// router.use(printMiddleware(["user"]));
// router.use(endHere(["url", "originalUrl", "params", "query", "session", "headers", "user"]));

//add rotes app
router.use("/config/user", userConfig)
router.use("/config/admin", adminConfig)

router.use("/newreports",newReport)
router.use("/reports", report);
router.use("/reportDepartmets", reportDepartments);
router.use("/schedulesreport", schedulesreport);
router.use("/downloadVideo", downloadVideo);
/*
*/
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////


export default router;
