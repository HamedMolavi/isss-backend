import { Router } from 'express';
import resourceRoutes from './resource.Routes';
import signalRoutes from './signal.Routes';
import systemBackupRoutes from './systemBackup.routes';
import serverTimeRoutes from './serverTime.routes';

const router: Router = Router();

router.use('/info', resourceRoutes);
router.use('/signal', signalRoutes);
router.use('', systemBackupRoutes);
router.use('', serverTimeRoutes);

export default router;
