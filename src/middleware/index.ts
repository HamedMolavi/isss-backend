import { Router } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import localVarMiddleware from "./localVar.middleware";
import { setupLogger } from "./logger.middleware";
import cookieParser from "cookie-parser";
import { authHeaderExtraction } from "./auth.middleware";
import { sessionMiddleware } from "./session.middleware";


const router: Router = Router();


///////////////////////////////////////////////////////////////////////////////// Credentials and authentication
router.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

router.use([
  cookieParser(),
  authHeaderExtraction,
  sessionMiddleware,
]);

///////////////////////////////////////////////////////////////////////////////// Parsing & Logger
router.use(
  bodyParser.json({ limit: "50mb" }),
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    //parameterLimit: 50000,
  }),
  bodyParser.text({ limit: "200mb" }),
  setupLogger(),
  localVarMiddleware,
);


export default router;