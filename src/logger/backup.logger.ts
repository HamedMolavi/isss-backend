import { Request } from 'express';
import { Logger } from '.';
import { LogType } from '../db/mongo/models/logType';
import { Log } from '../db/mongo/models/secLog';
import { LOG_TYPE_KEYS } from '../types/enums/logType.enum';
import { getClientIP } from '../tools/util.tools';
import { sanitizeUserAgent } from '../tools/user_agent.utility';

/**
 * Backup service event types
 */
export enum BackupEventType {
	BACKUP_CREATED = 'backup_created',
	BACKUP_CREATE_FAILED = 'backup_create_failed',
	BACKUP_RESTORED = 'backup_restored',
	BACKUP_RESTORE_FAILED = 'backup_restore_failed',
	BACKUP_UPLOADED = 'backup_uploaded',
	BACKUP_UPLOAD_FAILED = 'backup_upload_failed',
	BACKUP_DOWNLOADED = 'backup_downloaded',
	BACKUP_DOWNLOAD_FAILED = 'backup_download_failed',
	BACKUP_DELETED = 'backup_deleted',
	BACKUP_DELETE_FAILED = 'backup_delete_failed',
	BACKUP_CLEANUP = 'backup_cleanup',
	BACKUP_CLEANUP_FAILED = 'backup_cleanup_failed',
	LOG_CLEANUP_STARTED = 'log_cleanup_started',
	TTL_BACKUP_STARTED = 'ttl_backup_started',
	TTL_BACKUP_COMPLETED = 'ttl_backup_completed',
	TTL_BACKUP_FAILED = 'ttl_backup_failed',
	AUTO_BACKUP_STARTED = 'auto_backup_started',
	AUTO_BACKUP_COMPLETED = 'auto_backup_completed',
	AUTO_BACKUP_FAILED = 'auto_backup_failed',
	COMPRESSED_BACKUP_CREATED = 'compressed_backup_created',
	COMPRESSED_BACKUP_FAILED = 'compressed_backup_failed',
	FTP_UPLOAD_COMPLETED = 'ftp_upload_completed',
	FTP_UPLOAD_FAILED = 'ftp_upload_failed',
	STORAGE_WARNING_THRESHOLD_EXCEEDED = 'storage_warning_threshold_exceeded',
	STORAGE_CRITICAL_THRESHOLD_EXCEEDED = 'storage_critical_threshold_exceeded',
	STORAGE_THRESHOLD_CLEARED = 'storage_threshold_cleared'
}

/**
 * Backup service logger
 */
export class BackupLogger {
	private static createBaseLogData(
		action: string,
		success: boolean,
		req?: Request,
		type: string = 'backup_service'
	) {
		return {
			type,
			action,
			success,
			userid: req?.user?._id?.toString() || 'system',
			username: req?.user?.username || 'system',
			ip: (req ? getClientIP(req) : '') || 'system',
			userAgent: req ? sanitizeUserAgent(req.get('User-Agent')) : 'system',
			method: req?.method || 'SYSTEM',
			url: req?.originalUrl || 'system_operation',
			timestamp: new Date(),
			component: 'backup_service',
			operation: action
		};
	}

	/**
	 * Log successful backup creation
	 */
	static async backupCreated(
		backupPath: string,
		stats: { totalLogs: number; backupSize: number; backupDate: Date },
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Backup created successfully', {
					...this.createBaseLogData(BackupEventType.BACKUP_CREATED, true, req),
					details: {
						backupPath,
						totalLogs: stats.totalLogs,
						backupSizeMB: Math.round((stats.backupSize / 1024 / 1024) * 100) / 100,
						backupDate: stats.backupDate,
						backupType: 'standard'
					}
				});
			}
		} catch (error) {
			console.error('Error logging backup creation:', error);
		}
	}

	/**
	 * Log failed backup creation
	 */
	static backupCreateFailed(error: string, req?: Request): void {
		Logger.error('Backup creation failed', {
			...this.createBaseLogData(BackupEventType.BACKUP_CREATE_FAILED, false, req),
			details: {
				error,
				backupType: 'standard',
				failureReason: error
			}
		});
	}

	/**
	 * Log successful TTL backup
	 */
	static async ttlBackupCompleted(
		backupPath: string,
		stats: { totalLogs: number; backupSize: number; backupDate: Date },
		cleanedLogsCount: number,
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('TTL backup completed successfully', {
					...this.createBaseLogData(BackupEventType.TTL_BACKUP_COMPLETED, true, req),
					details: {
						backupPath,
						totalLogs: stats.totalLogs,
						backupSizeMB: Math.round((stats.backupSize / 1024 / 1024) * 100) / 100,
						backupDate: stats.backupDate,
						cleanedLogsCount,
						backupType: 'ttl_cleanup'
					}
				});
			}
		} catch (error) {
			console.error('Error logging TTL backup completion:', error);
		}
	}

	/**
	 * Log failed TTL backup
	 */
	static ttlBackupFailed(error: string, req?: Request): void {
		Logger.error('TTL backup failed', {
			...this.createBaseLogData(BackupEventType.TTL_BACKUP_FAILED, false, req),
			details: {
				error,
				backupType: 'ttl_cleanup',
				failureReason: error
			}
		});
	}

	/**
	 * Log successful backup restore
	 */
	static async backupRestored(
		backupPath: string,
		result: { totalRestored: number; duplicatesSkipped: number; errors: number },
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Backup restored successfully', {
					...this.createBaseLogData(BackupEventType.BACKUP_RESTORED, true, req),
					details: {
						backupPath,
						totalRestored: result.totalRestored,
						duplicatesSkipped: result.duplicatesSkipped,
						errors: result.errors,
						operation: 'restore'
					}
				});
			}
		} catch (error) {
			console.error('Error logging backup restore:', error);
		}
	}

	/**
	 * Log failed backup restore
	 */
	static backupRestoreFailed(backupPath: string, error: string, req?: Request): void {
		Logger.error('Backup restore failed', {
			...this.createBaseLogData(BackupEventType.BACKUP_RESTORE_FAILED, false, req),
			details: {
				backupPath,
				error,
				operation: 'restore',
				failureReason: error
			}
		});
	}

	/**
	 * Log successful FTP upload
	 */
	static async ftpUploadCompleted(
		fileName: string,
		ftpHost: string,
		ftpPath: string,
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Backup uploaded to FTP successfully', {
					...this.createBaseLogData(BackupEventType.FTP_UPLOAD_COMPLETED, true, req),
					details: {
						fileName,
						ftpHost,
						ftpPath,
						operation: 'ftp_upload'
					}
				});
			}
		} catch (error) {
			console.error('Error logging FTP upload:', error);
		}
	}

	/**
	 * Log failed FTP upload
	 */
	static ftpUploadFailed(fileName: string, ftpHost: string, error: string, req?: Request): void {
		Logger.error('FTP upload failed', {
			...this.createBaseLogData(BackupEventType.FTP_UPLOAD_FAILED, false, req),
			details: {
				fileName,
				ftpHost,
				error,
				operation: 'ftp_upload',
				failureReason: error
			}
		});
	}

	/**
	 * Log successful backup download
	 */
	static async backupDownloaded(fileName: string, fileSize: number, req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Backup downloaded successfully', {
					...this.createBaseLogData(BackupEventType.BACKUP_DOWNLOADED, true, req),
					details: {
						fileName,
						fileSizeMB: Math.round((fileSize / 1024 / 1024) * 100) / 100,
						operation: 'download'
					}
				});
			}
		} catch (error) {
			console.error('Error logging backup download:', error);
		}
	}

	/**
	 * Log failed backup download
	 */
	static backupDownloadFailed(fileName: string, error: string, req?: Request): void {
		Logger.error('Backup download failed', {
			...this.createBaseLogData(BackupEventType.BACKUP_DOWNLOAD_FAILED, false, req),
			details: {
				fileName,
				error,
				operation: 'download',
				failureReason: error
			}
		});
	}

	/**
	 * Log successful backup cleanup
	 */
	static async backupCleanup(deletedCount: number, retentionDays: number, req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Old backup files cleaned up', {
					...this.createBaseLogData(BackupEventType.BACKUP_CLEANUP, true, req),
					details: {
						deletedCount,
						retentionDays,
						operation: 'cleanup'
					}
				});
			}
		} catch (error) {
			console.error('Error logging backup cleanup:', error);
		}
	}

	/**
	 * Persist the cleanup audit record before deleting any logs.
	 * The returned ID must be excluded from the cleanup query so this record survives the operation.
	 */
	static async logRecordsCleanupStarted(
		logsScheduledForDeletion: number,
		retentionDays: number,
		req?: Request,
		context?: {
			backupCreated?: boolean;
			backupPath?: string | null;
			cleanupType?: string;
			cutoffDate?: Date;
			forced?: boolean;
		}
	): Promise<string> {
		try {
			const timestamp = new Date();
			const metadata = {
				...this.createBaseLogData(BackupEventType.LOG_CLEANUP_STARTED, true, req, 'log_cleanup'),
				timestamp,
				details: {
					logsScheduledForDeletion,
					retentionDays,
					backupCreated: context?.backupCreated,
					backupPath: context?.backupPath,
					cleanupType: context?.cleanupType || 'ttl_log_cleanup',
					cutoffDate: context?.cutoffDate,
					forced: context?.forced,
					operation: 'log_cleanup'
				}
			};

			const auditLog = await Log.create({
				level: 'info',
				timestamp,
				message: 'Log cleanup started',
				action: BackupEventType.LOG_CLEANUP_STARTED,
				metadata
			});

			return auditLog._id.toString();
		} catch (error) {
			console.error('Error logging log cleanup start:', error);
			throw error;
		}
	}

	/**
	 * Log failed backup cleanup
	 */
	static backupCleanupFailed(error: string, req?: Request): void {
		Logger.error('Backup cleanup failed', {
			...this.createBaseLogData(BackupEventType.BACKUP_CLEANUP_FAILED, false, req),
			details: {
				error,
				operation: 'cleanup',
				failureReason: error
			}
		});
	}

	/**
	 * Log successful auto backup start
	 */
	static async autoBackupStarted(
		config: { isAutoBackup: boolean; backupIntervalDays?: number },
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Automatic backup process started', {
					...this.createBaseLogData(BackupEventType.AUTO_BACKUP_STARTED, true, req),
					details: {
						isAutoBackup: config.isAutoBackup,
						backupIntervalDays: config.backupIntervalDays || 30,
						operation: 'auto_backup',
						phase: 'start'
					}
				});
			}
		} catch (error) {
			console.error('Error logging auto backup start:', error);
		}
	}

	/**
	 * Log successful auto backup completion
	 */
	static async autoBackupCompleted(
		stats: { totalLogs: number; backupSize: number },
		deletedCount: number,
		ftpUpload: boolean,
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Automatic backup completed successfully', {
					...this.createBaseLogData(BackupEventType.AUTO_BACKUP_COMPLETED, true, req),
					details: {
						totalLogs: stats.totalLogs,
						backupSizeMB: Math.round((stats.backupSize / 1024 / 1024) * 100) / 100,
						deletedCount,
						ftpUpload,
						operation: 'auto_backup',
						phase: 'complete'
					}
				});
			}
		} catch (error) {
			console.error('Error logging auto backup completion:', error);
		}
	}

	/**
	 * Log failed auto backup
	 */
	static autoBackupFailed(error: string, req?: Request): void {
		Logger.error('Automatic backup failed', {
			...this.createBaseLogData(BackupEventType.AUTO_BACKUP_FAILED, false, req),
			details: {
				error,
				operation: 'auto_backup',
				phase: 'failed',
				failureReason: error
			}
		});
	}

	/**
	 * Log successful compressed backup creation
	 */
	static async compressedBackupCreated(
		backupPath: string,
		stats: { totalLogs: number; backupSize: number },
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Compressed backup created successfully', {
					...this.createBaseLogData(BackupEventType.COMPRESSED_BACKUP_CREATED, true, req),
					details: {
						backupPath,
						totalLogs: stats.totalLogs,
						backupSizeMB: Math.round((stats.backupSize / 1024 / 1024) * 100) / 100,
						backupType: 'compressed',
						operation: 'create_compressed'
					}
				});
			}
		} catch (error) {
			console.error('Error logging compressed backup creation:', error);
		}
	}

	/**
	 * Log failed compressed backup creation
	 */
	static compressedBackupFailed(error: string, req?: Request): void {
		Logger.error('Compressed backup creation failed', {
			...this.createBaseLogData(BackupEventType.COMPRESSED_BACKUP_FAILED, false, req),
			details: {
				error,
				backupType: 'compressed',
				operation: 'create_compressed',
				failureReason: error
			}
		});
	}

	/**
	 * Log storage warning threshold exceeded
	 */
	static async storageWarningThresholdExceeded(
		storageInfo: {
			currentSizeBytes: number;
			maxSizeBytes: number;
			usagePercent: number;
			warningThreshold: number;
			totalLogs: number;
		},
		req?: Request
	): Promise<void> {
		try {
			Logger.warn('Storage warning threshold exceeded', {
				...this.createBaseLogData(
					BackupEventType.STORAGE_WARNING_THRESHOLD_EXCEEDED,
					true,
					req,
					'storage_warning'
				),
				details: {
					currentSizeMB: Math.round((storageInfo.currentSizeBytes / 1024 / 1024) * 100) / 100,
					maxSizeMB: Math.round((storageInfo.maxSizeBytes / 1024 / 1024) * 100) / 100,
					usagePercent: Math.round(storageInfo.usagePercent * 100) / 100,
					warningThreshold: storageInfo.warningThreshold * 100,
					totalLogs: storageInfo.totalLogs,
					severity: 'warning',
					recommendation: 'Consider backing up and cleaning old logs to free up storage space'
				}
			});
		} catch (error) {
			console.error('Error logging storage warning:', error);
		}
	}

	/**
	 * Log storage critical threshold exceeded (>95%)
	 */
	static async storageCriticalThresholdExceeded(
		storageInfo: {
			currentSizeBytes: number;
			maxSizeBytes: number;
			usagePercent: number;
			totalLogs: number;
		},
		req?: Request
	): Promise<void> {
		try {
			Logger.warn('Storage critical threshold exceeded', {
				...this.createBaseLogData(
					BackupEventType.STORAGE_CRITICAL_THRESHOLD_EXCEEDED,
					true,
					req,
					'storage_critical'
				),
				details: {
					currentSizeMB: Math.round((storageInfo.currentSizeBytes / 1024 / 1024) * 100) / 100,
					maxSizeMB: Math.round((storageInfo.maxSizeBytes / 1024 / 1024) * 100) / 100,
					usagePercent: Math.round(storageInfo.usagePercent * 100) / 100,
					totalLogs: storageInfo.totalLogs,
					severity: 'critical',
					recommendation: 'Immediate action required: backup and clean old logs to prevent data loss'
				}
			});
		} catch (error) {
			console.error('Error logging storage critical warning:', error);
		}
	}

	/**
	 * Log storage threshold cleared (back to normal)
	 */
	static async storageThresholdCleared(
		storageInfo: {
			currentSizeBytes: number;
			maxSizeBytes: number;
			usagePercent: number;
			previousUsagePercent: number;
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Storage usage returned to normal', {
					...this.createBaseLogData(BackupEventType.STORAGE_THRESHOLD_CLEARED, true, req, 'storage_info'),
					details: {
						currentSizeMB: Math.round((storageInfo.currentSizeBytes / 1024 / 1024) * 100) / 100,
						maxSizeMB: Math.round((storageInfo.maxSizeBytes / 1024 / 1024) * 100) / 100,
						usagePercent: Math.round(storageInfo.usagePercent * 100) / 100,
						previousUsagePercent: Math.round(storageInfo.previousUsagePercent * 100) / 100,
						severity: 'info',
						status: 'normal'
					}
				});
			}
		} catch (error) {
			console.error('Error logging storage threshold cleared:', error);
		}
	}
}
