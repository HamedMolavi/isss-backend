import { Router } from 'express';
import { accessCheck } from '../../authentication/accessCheck.auth';
import {
	createSystemBackup,
	restoreSystemBackup,
	listSystemBackups,
	listMinIOFolders,
	estimateBackup,
	getBackupStatus,
	listBackupJobs,
	cancelBackupJob,
	exportMinIOToExternalDrive,
	getExternalDrives,
	listExternalBackups
} from '../../controllers/systemBackup.controller';

const SystemBackupRouter: Router = Router();

const route_prefix = '/backup';

// List available system backup files
SystemBackupRouter.get(route_prefix, accessCheck('system'), listSystemBackups);

// Estimate backup size, duration, and check storage
SystemBackupRouter.post(`${route_prefix}/estimate`, accessCheck('system'), estimateBackup);

// Create system backup (MongoDB, Elasticsearch, MinIO)
SystemBackupRouter.post(route_prefix, accessCheck('system'), createSystemBackup);

// Restore system backup from path (e.g., external drive)
SystemBackupRouter.post(`${route_prefix}/restore`, accessCheck('system'), restoreSystemBackup);

// List folders in a MinIO bucket
SystemBackupRouter.get(`${route_prefix}/minio/folders`, accessCheck('system'), listMinIOFolders);

// Get all external drives
SystemBackupRouter.get(`${route_prefix}/external-drives`, accessCheck('system'), getExternalDrives);

// List backup files on external drive
SystemBackupRouter.get(`${route_prefix}/external-backups`, accessCheck('system'), listExternalBackups);

// Export MinIO data to external drive
SystemBackupRouter.post(`${route_prefix}/minio/export`, accessCheck('system'), exportMinIOToExternalDrive);

// Get backup job status
SystemBackupRouter.get(`${route_prefix}/status/:jobId`, accessCheck('system'), getBackupStatus);

// Cancel/delete backup job
SystemBackupRouter.delete(`${route_prefix}/jobs/:jobId`, accessCheck('system'), cancelBackupJob);

// List all backup jobs
SystemBackupRouter.get(`${route_prefix}/jobs`, accessCheck('system'), listBackupJobs);

export default SystemBackupRouter;
