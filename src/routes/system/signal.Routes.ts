import { Router } from "express";
import { SignalProducer } from "../../tools/systemSignal.tools";

const router: Router = Router();
const sg = new SignalProducer();

router.get("/restart", sg.sendRestartSignalMiddleware);

export default router;