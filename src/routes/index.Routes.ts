import { Router } from "express";
import userConfig from "./config/userConfig.Routes";
import adminConfig from "./config/adminConfig.Routes";
import login from "./auth/login.Routes";


import downloadVideo from "./report/videoDownload.Routes";
import report from "./report/report.Routes";
import schedulesreport from "./report/schedulesReport.Routes";
import reportDepartments from "./report/departmentReport.Routes";

import { passportGate } from "../authentication/authorize.auth";
import accessCheck from "../authentication/accessCheck.auth";
import { Access } from "../types/enums/access.enum";
import { endHere, printMiddleware } from "../test/endpointTest/endhere.test";

const router: Router = Router();

//routes in which verification is not needed
router.use("/auth/login", login);

//middleware for check and verify token
router.use(passportGate);



// router.use(printMiddleware(["user"]));
router.use(endHere(["url", "originalUrl", "params", "query", "session", "headers", "user"]));

//add rotes app
// router.use("/config/user", accessCheck(Access.Configuration, "user"), userConfig)
// router.use("/config/admin", accessCheck(Access.Configuration, "admin"), adminConfig)

/*
router.use("/reports", report, accessCheck(Access.Configuration, "user"), ?);
router.use("/reportDepartmets", reportDepartments);
router.use("/schedulesreport", schedulesreport);
router.use("/downloadVideo", downloadVideo);
*/
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////


export default router;
