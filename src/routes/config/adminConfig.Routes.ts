import { Router } from "express";


import userRoutes from "./user.Routes";
import accessLevels from "./accessLevel.Routes";
import { roleCheck } from "../../authentication/accessCheck.auth";

const router: Router = Router();

//add rotes
router.use("/users", userRoutes);
router.use("/accessLevels", roleCheck("admin"), accessLevels);


export default router;
