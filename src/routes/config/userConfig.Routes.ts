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
import reportDepartementfiles from "./departmentFile.Routes";
import PersonImage from "./personImage.Routes";
import notification from "./notification.Routes";
import testSMS from "./testSMS.Routes";
import testEmail from "./testEmailSend.Routes";
import snapshot from "./snapshot.Routes";

const router: Router = Router();
import modelRoutes from "./model.Routes";
import { testAccessCheck } from "../../authentication/accessCheck.auth";

//add rotes
router.use("/cameras", testAccessCheck("camera"), cameraRoutes);
router.use("/cars", testAccessCheck("car"), carRoutes);
router.use("/carcolors", testAccessCheck("color"), carColorRoutes);
router.use("/carbrands", testAccessCheck("brand"), carBrandRoutes);
router.use("/departments", testAccessCheck("department"), departementRoutes);
router.use("/sections", testAccessCheck("section"), sectionRoutes);
router.use("/jobtitles", testAccessCheck("job"), jobTitleRoutes);
router.use("/personnels", testAccessCheck("personnel"), personnelRoutes);
router.use("/schedules", testAccessCheck("schedule"), scheduleRoutes);
router.use("/files", fileRoutes);
router.use("/models", modelRoutes);
router.use("/modelToCameras", modelToCamera);
router.use("/departementfiles", reportDepartementfiles);
router.use("/personImage", PersonImage);
router.use("/notifications", notification);
router.use("/testsms", testSMS);
router.use("/testemail", testEmail);
router.use("/snapshot", snapshot);


export default router;
