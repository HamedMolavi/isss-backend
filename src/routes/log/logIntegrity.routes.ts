import { Router } from 'express';
import {
	verifyRecentLogsIntegrity,
	checkLogModification,
	getIntegrityStatus
} from '../../controllers/logIntegrity.controller';

const LogIntegrityRouter: Router = Router();

const route_prefix = '/integrity';

// Get integrity service status
LogIntegrityRouter.get(`${route_prefix}/status`, getIntegrityStatus);

// Verify integrity of recent logs
LogIntegrityRouter.get(`${route_prefix}/verify`, verifyRecentLogsIntegrity);

// Check if a specific log has been modified
LogIntegrityRouter.get(`${route_prefix}/check/:logId`, checkLogModification);

export default LogIntegrityRouter;
