import { Router } from 'express';
import { accessCheck } from '../../authentication/accessCheck.auth';
import {
	checkTTLStatus,
	createManualBackup,
	createCompressedBackup,
	downloadBackup,
	performTTLCleanup,
	getBackupConfig,
	triggerAutoBackup,
	restoreFromBackup,
	listBackupFiles
} from '../../controllers/logBackup.controller';

const LogBackupRouter: Router = Router();

const route_prefix = '/backup';

// Get TTL status and backup requirements
LogBackupRouter.get(`${route_prefix}/status`, accessCheck('systemLog'), checkTTLStatus);

// Get backup configuration
LogBackupRouter.get(`${route_prefix}/config`, accessCheck('systemLog'), getBackupConfig);

// List available backup files
LogBackupRouter.get(`${route_prefix}/files`, accessCheck('systemLog'), listBackupFiles);

// Create manual backup (TTL-based)
LogBackupRouter.post(`${route_prefix}/manual`, accessCheck('systemLog'), createManualBackup);

// Create compressed backup with optional date range
LogBackupRouter.post(`${route_prefix}/compressed`, accessCheck('systemLog'), createCompressedBackup);

// Download backup file
LogBackupRouter.get(`${route_prefix}/download`, accessCheck('systemLog'), downloadBackup);

// Perform TTL cleanup with backup
LogBackupRouter.post(`${route_prefix}/cleanup`, accessCheck('systemLog'), performTTLCleanup);

// Trigger automatic backup manually
LogBackupRouter.post(`${route_prefix}/auto`, accessCheck('systemLog'), triggerAutoBackup);

// Restore logs from backup file
LogBackupRouter.post(`${route_prefix}/restore`, accessCheck('systemLog'), restoreFromBackup);

export default LogBackupRouter;
