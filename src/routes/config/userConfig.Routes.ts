import { Router } from "express";
import cameraRoutes from "./camera.Routes";
import carColorRoutes from "./carColor.Routes";
import carBrandRoutes from "./carBrand.Routes";

const router: Router = Router();

//add rotes
router.use("/cameras", cameraRoutes);
router.use("/carcolors", carColorRoutes);
router.use("/carbrands", carBrandRoutes);

export default router;
