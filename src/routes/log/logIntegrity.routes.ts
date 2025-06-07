import { Router } from 'express';
import { accessCheck } from '../../authentication/accessCheck.auth';
import {
	verifyRecentLogsIntegrity,
	checkLogModification,
	getIntegrityStatus
} from '../../controllers/logIntegrity.controller';

const LogIntegrityRouter: Router = Router();

const route_prefix = '/integrity';

// Get integrity service status
LogIntegrityRouter.get(`${route_prefix}/status`, accessCheck('systemLog'), getIntegrityStatus);

// Verify integrity of recent logs
LogIntegrityRouter.get(`${route_prefix}/verify`, accessCheck('systemLog'), verifyRecentLogsIntegrity);

// Check if a specific log has been modified
LogIntegrityRouter.get(`${route_prefix}/check/:logId`, accessCheck('systemLog'), checkLogModification);

export default LogIntegrityRouter;
