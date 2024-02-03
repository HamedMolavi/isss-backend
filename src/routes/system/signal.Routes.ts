import { Router } from "express";
import { SignalConsumer, SignalProducer } from "../../tools/systemSignal.tools";

const router: Router = Router();
const sg = new SignalProducer();

router.patch("/restart", sg.sendRestartSignalMiddleware);

router.get("/restart", (_req, res, _next) => {
  return res.json({
    success: true,
    data: {
      restarted: SignalConsumer.restarted
    }
  })
});

export default router;