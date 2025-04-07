import { Router } from "express";

import { assignPassport, reLogin, sendTokenToclient, } from "../../authentication/authorize.auth";

//router instance
const router: Router = Router();

//api for login user
router.post(
  "",
  reLogin,
  assignPassport,
  sendTokenToclient
);

export default router;
