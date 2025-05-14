import { Router } from "express";
import resourceRoutes from "./resource.Routes"
import signalRoutes from "./signal.Routes"

const router: Router = Router();

router.use("/info", resourceRoutes);
router.use("/signal", signalRoutes);

export default router;