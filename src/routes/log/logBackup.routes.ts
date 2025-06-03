import { Router } from 'express';
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
LogBackupRouter.get(`${route_prefix}/status`, checkTTLStatus);

// Get backup configuration
LogBackupRouter.get(`${route_prefix}/config`, getBackupConfig);

// List available backup files
LogBackupRouter.get(`${route_prefix}/files`, listBackupFiles);

// Create manual backup (TTL-based)
LogBackupRouter.post(`${route_prefix}/manual`, createManualBackup);

// Create compressed backup with optional date range
LogBackupRouter.post(`${route_prefix}/compressed`, createCompressedBackup);

// Download backup file
LogBackupRouter.get(`${route_prefix}/download`, downloadBackup);

// Perform TTL cleanup with backup
LogBackupRouter.post(`${route_prefix}/cleanup`, performTTLCleanup);

// Trigger automatic backup manually
LogBackupRouter.post(`${route_prefix}/auto`, triggerAutoBackup);

// Restore logs from backup file
LogBackupRouter.post(`${route_prefix}/restore`, restoreFromBackup);

export default LogBackupRouter;
