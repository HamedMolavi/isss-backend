import { Router } from "express";


import userRoutes from "./user.Routes";
import { accessCheck, userCanGetHisInfo } from "../../authentication/accessCheck.auth";

const router: Router = Router();

//add rotes
router.use("/users",
  accessCheck("user", { extraFunction: userCanGetHisInfo }), // check if request came from admin or the user wants to get his own info
  userRoutes
);


export default router;
