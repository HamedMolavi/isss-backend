import { Router, Request, Response, NextFunction } from "express";
import userRoutes from "./custom/config/user.Routes";
import cameraRoutes from "./custom/config/camera.Routes";
import fileRoutes from "./custom/config/file.Routes";
import departementRoutes from "./custom/config/departement.Routes";
import sectionRoutes from "./custom/config/section.Routes";
import jobTitleRoutes from "./custom/config/jobTitle.Routes";
import personnelRoutes from "./custom/config/personnel.Routes";
import carRoutes from "./custom/config/car.Routes";
import scheduleRoutes from "./custom/config/schedule.Routes";
import modelRoutes from "./custom/config/model.Routes";
import carColorRoutes from "./custom/config/carColor.Routes";
import carBrandRoutes from "./custom/config/carBrand.Routes";
import modelToCamera from "./custom/config/modelToCamera.Routes";
import report from "./custom/report/report.Routes";
import reportDepartmets from "./custom/report/departmentReport.Routes";
import { ApiError } from "../error/error.handler";

//create router for add to server
const router: Router = Router();

//add rotes app
router.use("/users", userRoutes);
router.use("/cameras", cameraRoutes);
router.use("/files", fileRoutes);
router.use("/departements", departementRoutes);
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
router.use("/reportDepartmets", reportDepartmets);


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
    stack: enviroment ===  "development" ? err.stack : "",
  });
});

export default router;
