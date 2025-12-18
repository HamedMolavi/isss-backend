import { Request, Response } from 'express';
import {
	SystemBackupService,
	SystemBackupOptions,
	SystemRestoreOptions
} from '../services/systemBackup.service';
import { BackupJobManager, BackupJobStatus } from '../services/backupJobManager.service';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { BackupLogger } from '../logger/backup.logger';
import { randomBytes } from 'crypto';
import { Logger } from '../logger';
import { getClientIP } from '../tools/util.tools';

/**
 * Estimate backup size, duration, and check storage availability
 */
export const estimateBackup = async (req: Request, res: Response) => {
	try {
		const {
			includeMongoDB = true,
			includeElasticsearch = true,
			includeMinIO = true,
			includeFrame = false,
			mongoDBCollections,
			elasticsearchIndices,
			minIOBuckets,
			minIOFolders,
			externalDrivePath
		} = req.body as Partial<SystemBackupOptions>;

		const backupService = SystemBackupService.getInstance();

		const options: SystemBackupOptions = {
			includeMongoDB,
			includeElasticsearch,
			includeMinIO,
			includeFrame: typeof includeFrame === 'boolean' ? includeFrame : false,
			mongoDBCollections: Array.isArray(mongoDBCollections) ? mongoDBCollections : undefined,
			elasticsearchIndices: Array.isArray(elasticsearchIndices) ? elasticsearchIndices : undefined,
			minIOBuckets: Array.isArray(minIOBuckets) ? minIOBuckets : undefined,
			minIOFolders: minIOFolders && typeof minIOFolders === 'object' ? minIOFolders : undefined,
			externalDrivePath: typeof externalDrivePath === 'string' ? externalDrivePath : undefined
		};

		const startTime = new Date();
		const estimate = await backupService.estimateBackupTime(options, startTime);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Backup estimate calculated successfully',
			data: {
				estimatedSize: estimate.estimatedSize,
				estimatedSizeGB: (estimate.estimatedSize / 1024 / 1024 / 1024).toFixed(2),
				estimatedCompressedSize: estimate.estimatedCompressedSize,
				estimatedCompressedSizeGB: (estimate.estimatedCompressedSize / 1024 / 1024 / 1024).toFixed(2),
				compressionRatio: estimate.compressionRatio,
				compressionPercentage: `${((1 - estimate.compressionRatio) * 100).toFixed(0)}%`,
				estimatedDurationSeconds: estimate.estimatedDurationSeconds,
				estimatedDurationMinutes: Math.ceil(estimate.estimatedDurationSeconds / 60),
				estimatedCompletionTime: estimate.estimatedCompletionTime,
				storageCheck: {
					hasEnoughSpace: estimate.storageCheck.hasEnoughSpace,
					availableSpace: estimate.storageCheck.availableSpace,
					availableSpaceGB: (estimate.storageCheck.availableSpace / 1024 / 1024 / 1024).toFixed(2),
					estimatedBackupSize: estimate.storageCheck.estimatedBackupSize,
					estimatedBackupSizeGB: (estimate.storageCheck.estimatedBackupSize / 1024 / 1024 / 1024).toFixed(2),
					requiredSpace: estimate.storageCheck.requiredSpace,
					requiredSpaceGB: (estimate.storageCheck.requiredSpace / 1024 / 1024 / 1024).toFixed(2),
					error: estimate.storageCheck.error
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to estimate backup'
		});
	}
};

/**
 * Create system backup (MongoDB, Elasticsearch, MinIO) - runs in background
 */
export const createSystemBackup = async (req: Request, res: Response) => {
	try {
		const {
			includeMongoDB = true,
			includeElasticsearch = true,
			includeMinIO = true,
			includeFrame = false,
			mongoDBCollections,
			elasticsearchIndices,
			minIOBuckets,
			minIOFolders,
			externalDrivePath
		} = req.body as Partial<SystemBackupOptions>;

		const backupService = SystemBackupService.getInstance();
		const jobManager = BackupJobManager.getInstance();

		const options: SystemBackupOptions = {
			includeMongoDB,
			includeElasticsearch,
			includeMinIO,
			includeFrame: typeof includeFrame === 'boolean' ? includeFrame : false,
			mongoDBCollections: Array.isArray(mongoDBCollections) ? mongoDBCollections : undefined,
			elasticsearchIndices: Array.isArray(elasticsearchIndices) ? elasticsearchIndices : undefined,
			minIOBuckets: Array.isArray(minIOBuckets) ? minIOBuckets : undefined,
			minIOFolders: minIOFolders && typeof minIOFolders === 'object' ? minIOFolders : undefined,
			externalDrivePath: typeof externalDrivePath === 'string' ? externalDrivePath : undefined
		};

		// Get estimate and check storage before starting
		const startTime = new Date();
		const estimate = await backupService.estimateBackupTime(options, startTime);

		if (!estimate.storageCheck.hasEnoughSpace) {
			return ApiRes(res, {
				status: 507,
				msg: 'Insufficient storage space for backup',
				data: {
					storageCheck: {
						hasEnoughSpace: false,
						availableSpace: estimate.storageCheck.availableSpace,
						availableSpaceGB: (estimate.storageCheck.availableSpace / 1024 / 1024 / 1024).toFixed(2),
						estimatedBackupSize: estimate.storageCheck.estimatedBackupSize,
						estimatedBackupSizeGB: (estimate.storageCheck.estimatedBackupSize / 1024 / 1024 / 1024).toFixed(
							2
						),
						requiredSpace: estimate.storageCheck.requiredSpace,
						requiredSpaceGB: (estimate.storageCheck.requiredSpace / 1024 / 1024 / 1024).toFixed(2),
						error: estimate.storageCheck.error
					},
					estimate: {
						estimatedCompletionTime: estimate.estimatedCompletionTime,
						estimatedDurationMinutes: Math.ceil(estimate.estimatedDurationSeconds / 60)
					}
				}
			});
		}

		// Generate unique job ID
		const jobId = `backup_${Date.now()}_${randomBytes(8).toString('hex')}`;

		// Start backup job in background
		const jobProgress = await jobManager.startBackupJob(jobId, options, startTime);

		// Return immediately with job info
		return ApiRes(res, {
			status: HttpStatus.ACCEPTED, // 202 Accepted - request accepted but processing asynchronously
			msg: 'Backup job started successfully. Check status using jobId.',
			data: {
				jobId,
				status: jobProgress.status,
				currentStage: jobProgress.currentStage,
				progressPercentage: jobProgress.progressPercentage,
				startTime: jobProgress.startTime,
				estimatedCompletionTime: estimate.estimatedCompletionTime,
				estimatedDurationMinutes: Math.ceil(estimate.estimatedDurationSeconds / 60),
				statusUrl: `${process.env.BASE_URL}/system/backup/status/${jobId}`,
				externalDrivePath: options.externalDrivePath
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.backupCreateFailed(errorMessage, req);

		// Check if it's a storage error
		if (errorMessage.includes('Insufficient storage')) {
			return ApiRes(res, {
				status: 507,
				msg: errorMessage
			});
		}

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to create system backup'
		});
	}
};

/**
 * Get backup job status
 */
export const getBackupStatus = async (req: Request, res: Response) => {
	try {
		const { jobId } = req.params;

		if (!jobId) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Job ID is required'
			});
		}

		const jobManager = BackupJobManager.getInstance();
		const jobStatus = await jobManager.getJobStatus(jobId);

		if (!jobStatus) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'Backup job not found'
			});
		}

		const responseData: {
			jobId: string;
			status: BackupJobStatus;
			currentStage: string;
			progressPercentage: number;
			startTime: Date;
			estimatedCompletionTime?: Date;
			actualCompletionTime?: Date;
			stageDetails?: Record<string, string>;
			error?: string;
			result?: {
				backupPath: string;
				backupSize: number;
				backupSizeGB: string;
				components: Record<string, unknown>;
				downloadUrl: string;
				externalCopyPath?: string;
				externalDrivePath?: string;
			};
			actualDurationSeconds?: number;
			actualDurationMinutes?: number;
		} = {
			jobId: jobStatus.jobId,
			status: jobStatus.status,
			currentStage: jobStatus.currentStage,
			progressPercentage: jobStatus.progressPercentage,
			startTime: jobStatus.startTime,
			estimatedCompletionTime: jobStatus.estimatedCompletionTime,
			actualCompletionTime: jobStatus.actualCompletionTime,
			stageDetails: jobStatus.stageDetails,
			error: jobStatus.error
		};

		// If completed, include result
		if (jobStatus.status === BackupJobStatus.COMPLETED && jobStatus.result) {
			responseData.result = {
				backupPath: jobStatus.result.backupPath,
				backupSize: jobStatus.result.backupSize,
				backupSizeGB: (jobStatus.result.backupSize / 1024 / 1024 / 1024).toFixed(2),
				components: jobStatus.result.components,
				downloadUrl: jobStatus.result.downloadUrl || '', // Direct MinIO URL
				externalCopyPath: jobStatus.result.externalCopyPath,
				externalDrivePath: jobStatus.result.metadata?.externalDrivePath
			};

			if (jobStatus.startTime && jobStatus.actualCompletionTime) {
				const durationSeconds = Math.ceil(
					(jobStatus.actualCompletionTime.getTime() - jobStatus.startTime.getTime()) / 1000
				);
				responseData.actualDurationSeconds = durationSeconds;
				responseData.actualDurationMinutes = Math.ceil(durationSeconds / 60);
			}
		}

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Backup job status retrieved successfully',
			data: responseData
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to get backup job status'
		});
	}
};

/**
 * List all backup jobs with pagination
 */
export const listBackupJobs = async (req: Request, res: Response) => {
	try {
		const jobManager = BackupJobManager.getInstance();

		// Pagination parameters
		const page = Math.max(1, parseInt(req.query.page as string) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
		const skip = (page - 1) * limit;

		// Filter and sort parameters
		const status = req.query.status as BackupJobStatus | undefined;
		const sortBy = (req.query.sortBy as string) || 'createdAt';
		const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

		// Get jobs with pagination
		const [jobs, totalCount] = await Promise.all([
			jobManager.listJobs({ status, limit, skip, sortBy, sortOrder }),
			jobManager.countJobs({ status })
		]);

		const totalPages = Math.ceil(totalCount / limit);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Backup jobs retrieved successfully',
			data: {
				jobs: jobs.map((job) => ({
					jobId: job.jobId,
					jobType: job.jobType,
					status: job.status,
					currentStage: job.currentStage,
					progressPercentage: job.progressPercentage,
					startTime: job.startTime,
					estimatedCompletionTime: job.estimatedCompletionTime,
					actualCompletionTime: job.actualCompletionTime,
					storageType: job.storageType,
					expiresAt: job.expiresAt,
					error: job.error,
					hasResult: !!job.result,
					exportResult: job.exportResult
				})),
				pagination: {
					page,
					limit,
					totalCount,
					totalPages,
					hasNextPage: page < totalPages,
					hasPrevPage: page > 1
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to list backup jobs'
		});
	}
};

/**
 * Cancel/delete an in-progress backup job
 */
export const cancelBackupJob = async (req: Request, res: Response) => {
	try {
		const { jobId } = req.params;

		if (!jobId) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Job ID is required'
			});
		}

		const jobManager = BackupJobManager.getInstance();

		// Check if job exists
		const jobStatus = await jobManager.getJobStatus(jobId);
		if (!jobStatus) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'Backup job not found'
			});
		}

		// Check if job can be cancelled
		if (jobStatus.status === BackupJobStatus.COMPLETED) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Cannot cancel a completed backup job'
			});
		}

		if (jobStatus.status === BackupJobStatus.CANCELLED) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Backup job is already cancelled'
			});
		}

		// Cancel the job
		const cancelled = await jobManager.cancelJob(jobId);

		if (!cancelled) {
			return ApiRes(res, {
				status: HttpStatus.INTERNAL_SERVER_ERROR,
				msg: 'Failed to cancel backup job'
			});
		}

		Logger.info(`Backup job cancelled: ${jobId}`, {
			jobId,
			userId: req.user?.id,
			ip: getClientIP(req)
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Backup job cancelled successfully',
			data: {
				jobId,
				status: BackupJobStatus.CANCELLED,
				cancelledAt: new Date()
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to cancel backup job'
		});
	}
};

/**
 * Restore system backup from a file path (external drive, local path, or MinIO)
 */
export const restoreSystemBackup = async (req: Request, res: Response) => {
	try {
		const {
			backupPath,
			restoreMongoDB = true,
			restoreElasticsearch = true,
			restoreMinIO = true,
			skipExisting = false
		} = req.body as SystemRestoreOptions;

		if (!backupPath) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Backup path is required (e.g., /media/usb/backup.zip, s3://bucket/key, or http://minio:9000/bucket/key)'
			});
		}

		const backupService = SystemBackupService.getInstance();
		let actualBackupPath = backupPath;
		let tempDownloadPath: string | null = null;

		// Check if it's a MinIO/S3 path and download first
		if (
			backupPath.startsWith('s3://') ||
			backupPath.startsWith('http://') ||
			backupPath.startsWith('https://')
		) {
			const fs = await import('fs');
			const path = await import('path');
			const S3Client = (await import('../config/s3.config')).default;

			Logger.info(`Downloading backup from MinIO: ${backupPath}`);

			const s3Client = S3Client.instance();
			let bucket: string;
			let key: string;

			if (backupPath.startsWith('s3://')) {
				// Parse s3://bucket/key
				const pathWithoutProtocol = backupPath.replace('s3://', '');
				const slashIndex = pathWithoutProtocol.indexOf('/');
				bucket = pathWithoutProtocol.substring(0, slashIndex);
				key = pathWithoutProtocol.substring(slashIndex + 1);
			} else {
				// Parse http(s)://host:port/bucket/key
				const url = new URL(backupPath);
				const pathParts = url.pathname.split('/').filter(Boolean);
				bucket = pathParts[0];
				key = pathParts.slice(1).join('/');
			}

			// Download to temp location
			const tempDir = path.join(process.cwd(), 'backups', 'temp');
			fs.mkdirSync(tempDir, { recursive: true });
			tempDownloadPath = path.join(tempDir, `restore_${Date.now()}_${path.basename(key)}`);

			const getResponse = await s3Client.getObject({ Bucket: bucket, Key: key });

			if (getResponse.Body) {
				const chunks: Uint8Array[] = [];
				const bodyStream = getResponse.Body as AsyncIterable<Uint8Array>;
				for await (const chunk of bodyStream) {
					chunks.push(chunk);
				}
				const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
				const result = new Uint8Array(totalLength);
				let offset = 0;
				for (const chunk of chunks) {
					result.set(chunk, offset);
					offset += chunk.length;
				}
				fs.writeFileSync(tempDownloadPath, result);
				Logger.info(`Downloaded backup to: ${tempDownloadPath}`);
				actualBackupPath = tempDownloadPath;
			} else {
				throw new Error('Failed to download backup from MinIO');
			}
		}

		const options: SystemRestoreOptions = {
			backupPath: actualBackupPath,
			restoreMongoDB,
			restoreElasticsearch,
			restoreMinIO,
			skipExisting
		};

		const result = await backupService.restoreSystemBackup(options);

		// Cleanup temp file if downloaded from MinIO
		if (tempDownloadPath) {
			const fs = await import('fs');
			try {
				fs.unlinkSync(tempDownloadPath);
				Logger.info('Cleaned up temp backup file');
			} catch {
				Logger.warn('Failed to cleanup temp backup file');
			}
		}

		if (result.success) {
			await BackupLogger.backupRestored(
				backupPath,
				{
					totalRestored: Object.values(result.components).reduce(
						(sum: number, comp) => sum + (comp?.restored || 0),
						0
					),
					duplicatesSkipped: 0,
					errors: 0
				},
				req
			);

			return ApiRes(res, {
				status: HttpStatus.OK,
				msg: 'System backup restored successfully',
				data: {
					success: result.success,
					components: result.components,
					restoreOptions: options
				}
			});
		} else {
			BackupLogger.backupRestoreFailed(backupPath, result.error || 'Restore partially failed', req);

			return ApiRes(res, {
				status: 206,
				msg: 'System backup restored with errors',
				data: {
					success: result.success,
					components: result.components,
					error: result.error
				}
			});
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		BackupLogger.backupRestoreFailed(req.body.backupPath || 'unknown', errorMessage, req);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to restore system backup'
		});
	}
};

/**
 * List available system backup files from database with pagination
 */
export const listSystemBackups = async (req: Request, res: Response) => {
	try {
		const jobManager = BackupJobManager.getInstance();

		// Parse pagination parameters from query
		const page = parseInt(req.query.page as string) || 1;
		const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50 per page
		const skip = (page - 1) * limit;
		const sortBy = (req.query.sortBy as string) || 'createdAt';
		const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

		// Get completed backup jobs from database with pagination
		const backupJobs = await jobManager.listJobs({
			status: BackupJobStatus.COMPLETED,
			limit,
			skip,
			sortBy,
			sortOrder
		});

		// Get total count for pagination metadata
		const totalCount = await jobManager.countJobs({ status: BackupJobStatus.COMPLETED });

		// Transform to backup list format (simplified - without full components)
		const backups = backupJobs
			.filter((job) => job.result) // Only include jobs with results
			.map((job) => ({
				jobId: job.jobId,
				fileName: job.result!.backupPath.split('/').pop() || 'unknown',
				filePath: job.result!.backupPath,
				downloadUrl: job.result!.downloadUrl,
				size: job.result!.backupSize,
				createdAt: job.result!.metadata.backupDate,
				status: job.status,
				// Only include summary of components, not full details
				componentsSummary: {
					mongodb: job.result!.components.mongodb?.success || false,
					elasticsearch: job.result!.components.elasticsearch?.success || false,
					minio: job.result!.components.minio?.success || false,
					minioUpload: job.result!.components.minioUpload?.success || false
				}
			}));

		const totalPages = Math.ceil(totalCount / limit);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'System backups retrieved successfully',
			data: {
				backups,
				pagination: {
					page,
					limit,
					totalCount,
					totalPages,
					hasNextPage: page < totalPages,
					hasPrevPage: page > 1
				},
				totalSize: backups.reduce((sum: number, backup: { size: number }) => sum + backup.size, 0)
			}
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.backupCreateFailed(errorMessage, req);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to list system backups'
		});
	}
};

/**
 * List folders in a MinIO bucket
 */
export const listMinIOFolders = async (req: Request, res: Response) => {
	try {
		const { bucketName, prefix } = req.query as { bucketName?: string; prefix?: string };

		if (!bucketName) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Bucket name is required'
			});
		}

		const backupService = SystemBackupService.getInstance();
		const folders = await backupService.listMinIOFolders(bucketName, prefix);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Folders retrieved successfully',
			data: {
				bucketName,
				prefix: prefix || '',
				folders,
				count: folders.length
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to list folders'
		});
	}
};

/**
 * Get all external drives in the system
 */
export const getExternalDrives = async (req: Request, res: Response) => {
	try {
		const backupService = SystemBackupService.getInstance();
		const drives = await backupService.getExternalDrives();

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'External drives retrieved successfully',
			data: {
				drives: drives.map(
					(drive: {
						name: string;
						mountPoint: string;
						size: number;
						used: number;
						available: number;
						usagePercentage: number;
						filesystem: string;
					}) => ({
						name: drive.name,
						mountPoint: drive.mountPoint,
						size: drive.size,
						sizeGB: (drive.size / 1024 / 1024 / 1024).toFixed(2),
						used: drive.used,
						usedGB: (drive.used / 1024 / 1024 / 1024).toFixed(2),
						available: drive.available,
						availableGB: (drive.available / 1024 / 1024 / 1024).toFixed(2),
						usagePercentage: drive.usagePercentage,
						filesystem: drive.filesystem
					})
				),
				totalDrives: drives.length
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to get external drives'
		});
	}
};

/**
 * Export MinIO data to external drive (async job-based)
 */
export const exportMinIOToExternalDrive = async (req: Request, res: Response) => {
	try {
		const { externalDrivePath, buckets, folders } = req.body as {
			externalDrivePath: string;
			buckets?: string[];
			folders?: Record<string, string[]>;
		};

		if (!externalDrivePath) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'External drive path is required'
			});
		}

		// Generate unique job ID
		const jobId = `export_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
		const jobManager = BackupJobManager.getInstance();

		Logger.info('Starting MinIO export job', {
			jobId,
			externalDrivePath,
			buckets: buckets?.length || 'all',
			userId: req.user?.id
		});

		// Start export job (runs in background)
		const job = await jobManager.startExportJob(jobId, externalDrivePath, buckets, folders);

		return ApiRes(res, {
			status: HttpStatus.ACCEPTED,
			msg: 'MinIO export job started. Use the jobId to check status.',
			data: {
				jobId: job.jobId,
				status: job.status,
				message: 'Export running in background. Check status at GET /system/backup/status/:jobId'
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		Logger.error('MinIO export failed to start', {
			error: errorMessage,
			userId: req.user?.id
		});

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to start MinIO export'
		});
	}
};

/**
 * List backup files on external drive
 */
export const listExternalBackups = async (req: Request, res: Response) => {
	try {
		const { path: drivePath } = req.query as { path?: string };

		if (!drivePath) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Drive path is required (e.g., ?path=/media/usb-drive)'
			});
		}

		const fs = await import('fs');
		const pathModule = await import('path');

		if (!fs.existsSync(drivePath)) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: `Path does not exist: ${drivePath}`
			});
		}

		const stats = fs.statSync(drivePath);
		if (!stats.isDirectory()) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Path must be a directory'
			});
		}

		// Find all backup zip files recursively (max 2 levels deep)
		const backups: Array<{
			fileName: string;
			filePath: string;
			size: number;
			sizeGB: string;
			createdAt: Date;
			type: 'system_backup' | 'minio_export' | 'unknown';
		}> = [];

		const scanDir = (dir: string, depth = 0) => {
			if (depth > 2) return; // Max 2 levels deep

			try {
				const items = fs.readdirSync(dir);
				for (const item of items) {
					const itemPath = pathModule.join(dir, item);
					try {
						const itemStats = fs.statSync(itemPath);

						if (itemStats.isDirectory()) {
							// Check for minio_export directories
							if (item.startsWith('minio_export_')) {
								const manifestPath = pathModule.join(itemPath, 'export_manifest.json');
								if (fs.existsSync(manifestPath)) {
									const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
									backups.push({
										fileName: item,
										filePath: itemPath,
										size: manifest.totalSize || 0,
										sizeGB: manifest.totalSizeGB || '0',
										createdAt: new Date(manifest.exportDate || itemStats.mtime),
										type: 'minio_export'
									});
								}
							} else {
								scanDir(itemPath, depth + 1);
							}
						} else if (item.endsWith('.zip') && item.includes('backup')) {
							// System backup zip files
							backups.push({
								fileName: item,
								filePath: itemPath,
								size: itemStats.size,
								sizeGB: (itemStats.size / 1024 / 1024 / 1024).toFixed(2),
								createdAt: itemStats.mtime,
								type: item.startsWith('system_backup') ? 'system_backup' : 'unknown'
							});
						}
					} catch {
						// Skip inaccessible items
					}
				}
			} catch {
				// Skip inaccessible directories
			}
		};

		scanDir(drivePath);

		// Sort by creation date (newest first)
		backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: `Found ${backups.length} backup(s) on ${drivePath}`,
			data: {
				drivePath,
				totalBackups: backups.length,
				backups
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		Logger.error('Failed to list external backups', { error: errorMessage });

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to list external backups'
		});
	}
};
