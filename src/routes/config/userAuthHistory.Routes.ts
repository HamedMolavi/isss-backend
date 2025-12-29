import { Router } from 'express';
import { getMyAuthHistory, getMyAuthSummary } from '../../controllers/userAuthHistory.controller';

const router: Router = Router();

/**
 * GET /api/v1/config/user/auth-history
 * Get authentication history for the current user
 * Query params: page, limit
 */
router.get('/auth-history', getMyAuthHistory);

/**
 * GET /api/v1/config/user/auth-summary
 * Get authentication summary for the current user (last 30 days)
 */
router.get('/auth-summary', getMyAuthSummary);

export default router;
