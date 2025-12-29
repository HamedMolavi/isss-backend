import { Request, Response } from 'express';
import { LogBackupService } from '../services/logBackup.service';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { BackupLogger } from '../logger/backup.logger';
import { DataImportExportLogger } from '../logger/data-input-output.logger';

/**
 * Check TTL status and backup requirements
 */
export const checkTTLStatus = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		const ttlStatus = await backupService.checkTTLStatus();

		await BackupLogger.ttlBackupCompleted(
			'TTL status check',
			{
				totalLogs: ttlStatus.logsToExpire,
				backupSize: 0,
				backupDate: new Date()
			},
			ttlStatus.logsToExpire,
			req
		);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: ttlStatus.needsBackup ? 'Backup is needed' : 'No backup needed at this time',
			data: {
				...ttlStatus,
				reason: !ttlStatus.needsBackup
					? ttlStatus.logsToExpire === 0
						? 'No logs approaching expiration'
						: `Backup interval not reached (${ttlStatus.daysSinceLastBackup} days)`
					: 'Logs approaching expiration and backup interval reached'
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.ttlBackupFailed(errorMessage, req);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to check TTL status'
		});
	}
};

/**
 * Create manual backup
 */
export const createManualBackup = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		const config = await backupService.getBackupConfig();

		const { backupPath, stats } = await backupService.createTTLBackup(config);

		await BackupLogger.backupCreated(backupPath, stats, req);

		// Log backup export
		await DataImportExportLogger.backupExported(req, 'manual_backup', stats.totalLogs || 0, true);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Backup created successfully',
			data: {
				backupPath,
				stats,
				downloadUrl: `${process.env.BASE_URL}/logs/backup/download?path=${encodeURIComponent(backupPath)}`,
				backupConfig: {
					ttlDays: config.ttlDays,
					backupIntervalDays: config.backupIntervalDays,
					hasFtpConfig: !!config.ftpConfig
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.backupCreateFailed(errorMessage, req);

		// Log failed backup export
		await DataImportExportLogger.backupExported(req, 'manual_backup', 0, false, errorMessage);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to create backup'
		});
	}
};

/**
 * Create compressed backup with optional date range
 */
export const createCompressedBackup = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		const config = await backupService.getBackupConfig();

		const { startDate, endDate } = req.body;
		let dateRange;

		if (startDate && endDate) {
			dateRange = {
				startDate: new Date(startDate),
				endDate: new Date(endDate)
			};
		}

		const { backupPath, stats } = await backupService.createCompressedBackup(config, dateRange);

		await BackupLogger.compressedBackupCreated(backupPath, stats, req);

		// Log compressed backup export
		await DataImportExportLogger.backupExported(req, 'compressed_backup', stats.totalLogs || 0, true);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Compressed backup created successfully',
			data: {
				backupPath,
				stats,
				downloadUrl: `${process.env.BASE_URL}/logs/backup/download?path=${encodeURIComponent(backupPath)}`,
				dateRange,
				backupConfig: {
					ttlDays: config.ttlDays,
					backupIntervalDays: config.backupIntervalDays,
					hasFtpConfig: !!config.ftpConfig
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.compressedBackupFailed(errorMessage, req);

		// Log failed compressed backup export
		await DataImportExportLogger.backupExported(req, 'compressed_backup', 0, false, errorMessage);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to create compressed backup'
		});
	}
};

/**
 * Download backup file
 */
export const downloadBackup = async (req: Request, res: Response) => {
	const backupPath = req.query.path as string;
	try {
		if (!backupPath || typeof backupPath !== 'string') {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Backup path is required'
			});
		}

		const backupService = LogBackupService.getInstance();

		// Stream the backup file
		await backupService.streamBackupDownload(backupPath, res);

		// Note: We can't log successful download here since the response is streamed
		// The actual download completion should be logged in the service layer
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.backupDownloadFailed(
			backupPath,
			error instanceof Error ? error.message : 'Unknown error',
			req
		);

		if (!res.headersSent) {
			return ApiRes(res, {
				status: HttpStatus.INTERNAL_SERVER_ERROR,
				msg: errorMessage || 'Failed to download backup'
			});
		}
	}
};

/**
 * Perform TTL cleanup with backup
 */
export const performTTLCleanup = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		const config = await backupService.getBackupConfig();

		// Check if cleanup is needed
		const ttlStatus = await backupService.checkTTLStatus();

		if (!ttlStatus.needsBackup) {
			return ApiRes(res, {
				status: HttpStatus.OK,
				msg: 'No cleanup needed at this time',
				data: {
					ttlStatus,
					reason:
						ttlStatus.logsToExpire === 0
							? 'No logs approaching expiration'
							: `Backup interval not reached (${ttlStatus.daysSinceLastBackup}/${config.backupIntervalDays || 30} days)`
				}
			});
		}

		// Create backup first
		const { backupPath, stats } = await backupService.createTTLBackup(config);

		// Clean up old logs
		const deletedCount = await backupService.cleanupBackedUpLogs(config);

		await BackupLogger.ttlBackupCompleted(backupPath, stats, deletedCount, req);

		// Log TTL backup export
		await DataImportExportLogger.backupExported(req, 'ttl_cleanup_backup', stats.totalLogs || 0, true);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'TTL cleanup completed successfully',
			data: {
				backupPath,
				stats,
				deletedCount,
				downloadUrl: `${process.env.BASE_URL}/logs/backup/download?path=${encodeURIComponent(backupPath)}`,
				ttlStatus,
				backupConfig: {
					ttlDays: config.ttlDays,
					backupIntervalDays: config.backupIntervalDays,
					hasFtpConfig: !!config.ftpConfig
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.ttlBackupFailed(error instanceof Error ? error.message : 'Unknown error', req);

		// Log failed TTL backup export
		await DataImportExportLogger.backupExported(req, 'ttl_cleanup_backup', 0, false, errorMessage);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to perform TTL cleanup'
		});
	}
};

/**
 * Get backup configuration
 */
export const getBackupConfig = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		const config = await backupService.getBackupConfig();

		// Remove sensitive FTP information from response
		const safeConfig = {
			...config,
			ftpConfig: config.ftpConfig
				? {
						host: config.ftpConfig.host,
						user: config.ftpConfig.user,
						port: config.ftpConfig.port,
						secure: config.ftpConfig.secure,
						path: config.ftpConfig.path,
						configured: true
					}
				: undefined
		};

		await BackupLogger.autoBackupStarted(config, req);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Backup configuration retrieved successfully',
			data: safeConfig
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.autoBackupFailed(error instanceof Error ? error.message : 'Unknown error', req);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to get backup configuration'
		});
	}
};

/**
 * Trigger automatic backup manually
 */
export const triggerAutoBackup = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		const config = await backupService.getBackupConfig();

		if (!config.isAutoBackup) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Automatic backup is not enabled'
			});
		}

		// Check TTL status first to get information about the backup
		const ttlStatus = await backupService.checkTTLStatus();

		if (!ttlStatus.needsBackup) {
			return ApiRes(res, {
				status: HttpStatus.OK,
				msg: 'No backup needed at this time',
				data: {
					ttlStatus,
					reason:
						ttlStatus.logsToExpire === 0
							? 'No logs approaching expiration'
							: `Backup interval not reached (${ttlStatus.daysSinceLastBackup}/${config.backupIntervalDays || 30} days)`
				}
			});
		}

		await backupService.performAutoBackup(config);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Automatic backup completed successfully',
			data: {
				ttlStatus,
				backupConfig: {
					ttlDays: config.ttlDays,
					backupIntervalDays: config.backupIntervalDays,
					hasFtpConfig: !!config.ftpConfig
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.autoBackupFailed(error instanceof Error ? error.message : 'Unknown error', req);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to trigger automatic backup'
		});
	}
};

/**
 * Restore logs from backup file
 */
export const restoreFromBackup = async (req: Request, res: Response) => {
	const { backupPath, skipDuplicates = true, startDate, endDate } = req.body;
	try {
		if (!backupPath) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Backup path is required'
			});
		}

		// Validate file extension
		const fileExtension = backupPath.split('.').pop()?.toLowerCase();
		if (!fileExtension || !['json', 'zip'].includes(fileExtension)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Only .json and .zip backup files are allowed'
			});
		}

		const backupService = LogBackupService.getInstance();

		const options: {
			skipDuplicates?: boolean;
			dateRange?: { startDate: Date; endDate: Date };
		} = { skipDuplicates };

		if (startDate && endDate) {
			options.dateRange = {
				startDate: new Date(startDate),
				endDate: new Date(endDate)
			};
		}

		const result = await backupService.restoreFromBackup(backupPath, options);

		await BackupLogger.backupRestored(backupPath, result, req);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Backup restored successfully',
			data: {
				...result,
				restoreOptions: {
					skipDuplicates,
					dateRange: options.dateRange
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.backupRestoreFailed(
			backupPath,
			error instanceof Error ? error.message : 'Unknown error',
			req
		);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to restore backup'
		});
	}
};

/**
 * List available backup files
 */
export const listBackupFiles = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		const backupFiles = await backupService.listBackupFiles();

		await BackupLogger.backupCreated(
			'Backup files listed',
			{ totalLogs: backupFiles.length, backupSize: 0, backupDate: new Date() },
			req
		);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Backup files retrieved successfully',
			data: {
				files: backupFiles,
				totalFiles: backupFiles.length,
				totalSize: backupFiles.reduce((acc, file) => acc + file.size, 0),
				fileTypes: {
					json: backupFiles.filter((f) => f.type === 'json').length,
					zip: backupFiles.filter((f) => f.type === 'zip').length
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.backupCreateFailed(error instanceof Error ? error.message : 'Unknown error', req);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to list backup files'
		});
	}
};

/**
 * Enable auto backup
 */
export const enableAutoBackup = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		await backupService.setAutoBackupStatus(true);

		const config = await backupService.getBackupConfig();

		await BackupLogger.autoBackupStarted(config, req);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Auto backup enabled successfully',
			data: {
				isAutoBackup: true,
				backupConfig: {
					ttlDays: config.ttlDays,
					backupIntervalDays: config.backupIntervalDays,
					hasFtpConfig: !!config.ftpConfig
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.autoBackupFailed(error instanceof Error ? error.message : 'Unknown error', req);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to enable auto backup'
		});
	}
};

/**
 * Disable auto backup
 */
export const disableAutoBackup = async (req: Request, res: Response) => {
	try {
		const backupService = LogBackupService.getInstance();
		await backupService.setAutoBackupStatus(false);

		const config = await backupService.getBackupConfig();

		await BackupLogger.autoBackupCompleted(
			{
				totalLogs: 0,
				backupSize: 0
			},
			0,
			false,
			req
		);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Auto backup disabled successfully',
			data: {
				isAutoBackup: false,
				backupConfig: {
					ttlDays: config.ttlDays,
					backupIntervalDays: config.backupIntervalDays,
					hasFtpConfig: !!config.ftpConfig
				}
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		BackupLogger.autoBackupFailed(error instanceof Error ? error.message : 'Unknown error', req);

		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: errorMessage || 'Failed to disable auto backup'
		});
	}
};
