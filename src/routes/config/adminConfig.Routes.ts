import { Router } from "express";


import userRoutes from "./user.Routes";

const router: Router = Router();

//add rotes
router.use("/users", userRoutes);


export default router;
