import { Router } from 'express';
import { accessCheck, roleCheck } from '../../authentication/accessCheck.auth';
import {
	getLogStorageStats,
	triggerLogCleanup,
	getRetentionPreview,
	checkStorageWarning
} from '../../controllers/logConfig.controller';

const LogConfigRouter: Router = Router();

const route_prefix = '/backup';

/**
 * GET /api/v1/logs/backup/storage-stats
 * Get log storage statistics
 */
LogConfigRouter.get(`${route_prefix}/storage-stats`, accessCheck('systemLog'), getLogStorageStats);

/**
 * GET /api/v1/logs/backup/storage-warning
 * Check storage threshold warning status
 * Returns warning level (normal, warning, critical) and recommendations
 */
LogConfigRouter.get(`${route_prefix}/storage-warning`, accessCheck('systemLog'), checkStorageWarning);

/**
 * POST /api/v1/logs/backup/trigger-cleanup
 * Trigger immediate log cleanup based on TTL
 * Body: {
 *   createBackupFirst?: boolean (default: true)
 * }
 */
LogConfigRouter.post(`${route_prefix}/trigger-cleanup`, roleCheck('admin'), triggerLogCleanup);

/**
 * GET /api/v1/logs/backup/retention-preview
 * Get preview of logs that would be affected by TTL changes
 * Query: ttlDays (optional) - proposed TTL days to preview
 */
LogConfigRouter.get(`${route_prefix}/retention-preview`, accessCheck('systemLog'), getRetentionPreview);

export default LogConfigRouter;
