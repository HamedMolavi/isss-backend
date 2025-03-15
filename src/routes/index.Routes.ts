import { NextFunction, Request, Response, Router } from "express";
import userConfig from "./config/userConfig.Routes";


import downloadVideo from "./report/videoDownload.Routes";
import report from "./report/report.Routes";
import newReport from "./report/new.report"
import similarity from "./report/similarity.Routes"
import systemRoutes from "./system/index.Routes";
import schedulesreport from "./report/schedulesReport.Routes";
import reportDepartments from "./report/departmentReport.Routes";
import trackReport from "./report/trackReport.Routes";

const router: Router = Router();

//add rotes app
router.use("/config/user", userConfig)

router.use("/newreports", newReport);
router.use("/trackreports", trackReport);
router.use("/reports", report);
router.use("/reports/similar", similarity);
router.use("/reportDepartmets", reportDepartments);
router.use("/schedulesreport", schedulesreport);
router.use("/downloadVideo", downloadVideo);
router.use("/system", systemRoutes);

/*
*/
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////


export default router;
