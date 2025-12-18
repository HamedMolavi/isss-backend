import { Router } from 'express';
import { getServerTime } from '../../controllers/serverTime.controller';

const router: Router = Router();

/**
 * GET /api/v1/system/time
 * Get current server time for client synchronization
 */
router.get('/time', getServerTime);

export default router;
