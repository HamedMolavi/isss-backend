import { Router } from "express";
import systemResource from "./system.Routes"

const router: Router = Router();

router.use("/resource", systemResource)
// router.use("/restart", )

export default router;