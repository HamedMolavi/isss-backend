import { Router } from "express";
import cameraRoutes from "./camera.Routes";
import fileRoutes from "./file.Routes";
import departementRoutes from "./departement.Routes";
import sectionRoutes from "./section.Routes";
import jobTitleRoutes from "./jobTitle.Routes";
import personnelRoutes from "./personnel.Routes";
import carRoutes from "./car.Routes";
import scheduleRoutes from "./schedule.Routes";
import carColorRoutes from "./carColor.Routes";
import carBrandRoutes from "./carBrand.Routes";
import modelToCamera from "./modelToCamera.Routes";
import PersonImage from "./personImage.Routes";

const router: Router = Router();
import modelRoutes from "./model.Routes";

//add rotes
router.use("/cameras", cameraRoutes);
router.use("/cars", carRoutes);
router.use("/carcolors", carColorRoutes);
router.use("/carbrands", carBrandRoutes);
router.use("/departments", departementRoutes);
router.use("/sections", sectionRoutes);
router.use("/jobtitles", jobTitleRoutes);
router.use("/personnels", personnelRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/files", fileRoutes);
router.use("/models", modelRoutes);
router.use("/modelToCameras", modelToCamera);
router.use("/personImage", PersonImage);

export default router;
