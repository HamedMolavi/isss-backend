import { Router, Request, Response, NextFunction } from "express";
import userRoutes from "./config/user.Routes";
import cameraRoutes from "./config/camera.Routes";
import fileRoutes from "./config/file.Routes";
import departementRoutes from "./config/departement.Routes";
import sectionRoutes from "./config/section.Routes";
import jobTitleRoutes from "./config/jobTitle.Routes";
import personnelRoutes from "./config/personnel.Routes";
import carRoutes from "./config/car.Routes";
import scheduleRoutes from "./config/schedule.Routes";
import modelRoutes from "./config/model.Routes";
import carColorRoutes from "./config/carColor.Routes";
import carBrandRoutes from "./config/carBrand.Routes";
import modelToCamera from "./config/modelToCamera.Routes";
import report from "./report/report.Routes";
import reportDepartments from "./report/departmentReport.Routes";
import { ApiError } from "../error/error.handler";
import reportDepartementfiles from "./config/departmentFile.Routes";
import alerts from "./alerts/alerts.Routes";
import schedulesreport from "./report/schedulesReport.Routes";
import PersonImage from "../routes/config/personImage.Routes";
import downloadVideo from "../routes/report/videoDownload.Routes";
import notification from "../routes/config/notification.Routes";
import testSMS from "../routes/config/testSMS.Routes";
import testEmail from "../routes/config/testEmailSend.Routes";
import snapshot from "../routes/config/snapshot.Routes";

//create router for add to server
const router: Router = Router();

//add rotes app
router.use("/users", userRoutes);
router.use("/cameras", cameraRoutes);
router.use("/files", fileRoutes);
router.use("/departments", departementRoutes);
router.use("/sections", sectionRoutes);
router.use("/jobtitles", jobTitleRoutes);
router.use("/personnels", personnelRoutes);
router.use("/cars", carRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/models", modelRoutes);
router.use("/carcolors", carColorRoutes);
router.use("/carbrands", carBrandRoutes);
router.use("/modelToCameras", modelToCamera);
router.use("/reports", report);
router.use("/reportDepartmets", reportDepartments);
router.use("/departementfiles", reportDepartementfiles);
router.use("/alerts", alerts);
router.use("/schedulesreport", schedulesreport);
router.use("/personImage", PersonImage);
router.use("/downloadVideo", downloadVideo);
router.use("/notifications", notification);
router.use("/testsms", testSMS);
router.use("/testemail", testEmail);
router.use("/snapshot", snapshot);
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
//add not found route handler
router.use("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new ApiError(404, `Requested path ${req.path} not found`);
  next(err);
  //next(new ApiError(404, `Requested path ${req.path} not found`));
});

const enviroment = process.env.NODE_ENV || "development";
//add error handler middleware
router.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500; // <- Look here
  return res.status(statusCode).send({
    success: false,
    message: err.message,
    stack: enviroment === "development" ? err.stack : "",
  });
});

export default router;
