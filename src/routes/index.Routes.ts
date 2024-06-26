import { NextFunction, Request, Response, Router } from "express";
import userConfig from "./config/userConfig.Routes";
import adminConfig from "./config/adminConfig.Routes";
import login from "./auth/login.Routes";


import downloadVideo from "./report/videoDownload.Routes";
import report from "./report/report.Routes";
import newReport from "./report/new.report"
import similarity from "./report/similarity.Routes"
import systemRoutes from "./system/index.Routes";
import schedulesreport from "./report/schedulesReport.Routes";
import reportDepartments from "./report/departmentReport.Routes";
import trackReport from "./report/trackReport.Routes";

import { passportGate } from "../authentication/authorize.auth";
import { recordLastOperation } from "../middleware/userOperations.middleware";
import { accessCheck, hasAccess } from "../authentication/accessCheck.auth";

const router: Router = Router();

//routes in which verification is not needed
router.use("/auth/login", login);

//middleware for check and verify token
router.use(passportGate);
// router.use(recordLastOperation);



// router.use(printMiddleware(["user"]));
// router.use(endHere(["url", "originalUrl", "params", "query", "session", "headers", "user"]));

//add rotes app
router.use("/config/user", userConfig)
router.use("/config/admin", adminConfig)


router.use("/newreports", accessCheck("report", {
  // map POST to read
  extraFunction: (req, userAccess) => req.method === "POST" && !!userAccess && !!hasAccess(userAccess, "GET")
}), newReport);
router.use("/trackreports", trackReport);
router.use("/reports", report);
router.use("/reports/similar", similarity);
router.use("/reportDepartmets", reportDepartments);
router.use("/schedulesreport", schedulesreport);
router.use("/downloadVideo", downloadVideo);
router.use("/system", accessCheck("system"), systemRoutes);

/*
*/
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////


export default router;
