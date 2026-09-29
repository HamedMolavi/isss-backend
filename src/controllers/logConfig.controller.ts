import { Request, Response, NextFunction } from 'express';
import { SecurityConfig } from '../db/mongo/models/securityConfig';
import { Log } from '../db/mongo/models/secLog';
import { LogBackupService } from '../services/logBackup.service';
import { BackupSchedulerService } from '../services/backupScheduler.service';
import { BackupEventType, BackupLogger } from '../logger/backup.logger';
import { SecurityLogger } from '../logger/security.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { SQLite } from '../db/sqlite';

/**
 * Get current log TTL configuration
 */
export const getLogTTLConfig = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const config = await SecurityConfig.findOne();

		if (!config) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'Security configuration not found'
			});
		}

		const logBackupConfig = config.logBackup || {
			ttlDays: 60,
			backupIntervalDays: 30,
			maxSizeBytes: 1024 * 1024 * 1024,
			maxLogCount: 1000000,
			warningThreshold: 0.8,
			autoBackup: true,
			autoCleanup: false,
			checkIntervalHours: 24
		};

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Log TTL configuration retrieved successfully',
			data: {
				ttlDays: logBackupConfig.ttlDays,
				backupIntervalDays: logBackupConfig.backupIntervalDays,
				maxSizeBytes: logBackupConfig.maxSizeBytes,
				maxLogCount: logBackupConfig.maxLogCount,
				warningThreshold: logBackupConfig.warningThreshold,
				autoBackup: logBackupConfig.autoBackup,
				autoCleanup: logBackupConfig.autoCleanup,
				checkIntervalHours: logBackupConfig.checkIntervalHours
			}
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Update log TTL configuration
 * Endpoint: PUT /api/v1/logs/backup/ttl
 */
export const updateLogTTLConfig = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {
			ttlDays,
			backupIntervalDays,
			maxSizeBytes,
			maxLogCount,
			warningThreshold,
			autoBackup,
			autoCleanup,
			checkIntervalHours
		} = req.body;

		// Build update object with only provided fields
		const updateData: Record<string, unknown> = {};

		if (ttlDays !== undefined) {
			updateData['logBackup.ttlDays'] = ttlDays;
			updateData['logBackup.defaultConfig.ttlDays'] = ttlDays;
		}
		if (backupIntervalDays !== undefined) {
			updateData['logBackup.backupIntervalDays'] = backupIntervalDays;
		}
		if (maxSizeBytes !== undefined) {
			updateData['logBackup.maxSizeBytes'] = maxSizeBytes;
		}
		if (maxLogCount !== undefined) {
			updateData['logBackup.maxLogCount'] = maxLogCount;
		}
		if (warningThreshold !== undefined) {
			updateData['logBackup.warningThreshold'] = warningThreshold;
		}
		if (autoBackup !== undefined) {
			updateData['logBackup.autoBackup'] = autoBackup;
			updateData['logBackup.defaultConfig.isAutoBackup'] = autoBackup;
		}
		if (autoCleanup !== undefined) {
			updateData['logBackup.autoCleanup'] = autoCleanup;
		}
		if (checkIntervalHours !== undefined) {
			updateData['logBackup.checkIntervalHours'] = checkIntervalHours;
			updateData['logBackup.checkIntervalMs'] = checkIntervalHours * 60 * 60 * 1000;
		}

		if (Object.keys(updateData).length === 0) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'No valid configuration fields provided'
			});
		}

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ $set: updateData },
			{ new: true, upsert: true }
		);

		// Restart scheduler if critical config values change
		// These values affect when backup is needed, so we should check immediately
		const criticalConfigChanged =
			checkIntervalHours !== undefined ||
			autoBackup !== undefined ||
			maxLogCount !== undefined ||
			maxSizeBytes !== undefined ||
			ttlDays !== undefined ||
			backupIntervalDays !== undefined ||
			warningThreshold !== undefined;

		if (criticalConfigChanged) {
			const scheduler = BackupSchedulerService.getInstance();
			const shouldRun = autoBackup !== undefined ? !!autoBackup : (config?.logBackup?.autoBackup ?? true);

			if (!shouldRun) {
				await scheduler.stop();
			} else {
				// Restart scheduler to pick up new config values and perform immediate check
				await scheduler.restart();
			}
		}

		// Log the configuration change
		SecurityLogger.logBackupConfigUpdated(req, {
			ttlDays,
			backupIntervalDays,
			maxSizeBytes,
			maxLogCount,
			warningThreshold,
			autoBackup,
			autoCleanup,
			checkIntervalHours
		});

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Log TTL configuration updated successfully',
			data: {
				ttlDays: config?.logBackup?.ttlDays,
				backupIntervalDays: config?.logBackup?.backupIntervalDays,
				maxSizeBytes: config?.logBackup?.maxSizeBytes,
				maxLogCount: config?.logBackup?.maxLogCount,
				warningThreshold: config?.logBackup?.warningThreshold,
				autoBackup: config?.logBackup?.autoBackup,
				autoCleanup: config?.logBackup?.autoCleanup,
				checkIntervalHours: config?.logBackup?.checkIntervalHours
			}
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Get log storage statistics
 */
export const getLogStorageStats = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const config = await SecurityConfig.findOne();
		const backupService = LogBackupService.getInstance();

		// Get total log count
		const totalLogs = await Log.countDocuments();

		// Get oldest and newest logs
		const oldestLog = await Log.findOne({}, { timestamp: 1 }, { sort: { timestamp: 1 } });
		const newestLog = await Log.findOne({}, { timestamp: 1 }, { sort: { timestamp: -1 } });

		// Get logs approaching TTL (within the backup interval days)
		const ttlDays = config?.logBackup?.ttlDays || 60;
		const backupIntervalDays = config?.logBackup?.backupIntervalDays || 30;
		const maxSizeBytes = config?.logBackup?.maxSizeBytes || 1024 * 1024 * 1024;
		const maxLogCount = config?.logBackup?.maxLogCount || 1000000;
		const warningThreshold = config?.logBackup?.warningThreshold || 0.8;

		const ttlThreshold = new Date();
		ttlThreshold.setDate(ttlThreshold.getDate() - ttlDays + backupIntervalDays);

		const logsApproachingTTL = await Log.countDocuments({
			timestamp: { $lte: ttlThreshold }
		});

		// Estimate storage size (using MongoDB stats)
		let estimatedSizeBytes = 0;
		try {
			const stats = await Log.collection.stats();
			estimatedSizeBytes = stats.size || 0;
		} catch {
			// If stats not available, estimate based on average document size
			estimatedSizeBytes = totalLogs * 2048; // Rough estimate: ~2KB per log
		}

		// Calculate storage usage percentages
		const storageUsagePercent = maxSizeBytes > 0 ? (estimatedSizeBytes / maxSizeBytes) * 100 : 0;
		const logCountUsagePercent = maxLogCount > 0 ? (totalLogs / maxLogCount) * 100 : 0;

		const isStorageWarningReached = storageUsagePercent >= warningThreshold * 100;
		const isLogCountWarningReached = logCountUsagePercent >= warningThreshold * 100;
		const isWarningThresholdReached = isStorageWarningReached || isLogCountWarningReached;

		// Get TTL status from backup service
		const ttlStatus = await backupService.checkTTLStatus();

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Log storage statistics retrieved successfully',
			data: {
				totalLogs,
				totalSizeBytes: estimatedSizeBytes,
				totalSizeFormatted: formatBytes(estimatedSizeBytes),
				oldestLogDate: oldestLog?.timestamp || null,
				newestLogDate: newestLog?.timestamp || null,
				logsApproachingTTL,
				configuration: {
					ttlDays,
					backupIntervalDays,
					maxSizeBytes,
					maxSizeFormatted: formatBytes(maxSizeBytes),
					maxLogCount,
					maxLogCountFormatted: formatNumber(maxLogCount),
					warningThreshold,
					autoBackup: config?.logBackup?.autoBackup ?? true,
					autoCleanup: config?.logBackup?.autoCleanup ?? false
				},
				storage: {
					usagePercent: Math.round(storageUsagePercent * 100) / 100,
					isStorageWarningReached,
					remainingBytes: Math.max(0, maxSizeBytes - estimatedSizeBytes),
					remainingFormatted: formatBytes(Math.max(0, maxSizeBytes - estimatedSizeBytes))
				},
				logCount: {
					usagePercent: Math.round(logCountUsagePercent * 100) / 100,
					isLogCountWarningReached,
					remainingLogs: Math.max(0, maxLogCount - totalLogs),
					remainingLogsFormatted: formatNumber(Math.max(0, maxLogCount - totalLogs))
				},
				isWarningThresholdReached,
				backup: {
					lastBackupDate: ttlStatus.nextBackupDue
						? new Date(ttlStatus.nextBackupDue.getTime() - backupIntervalDays * 24 * 60 * 60 * 1000)
						: null,
					nextBackupDue: ttlStatus.nextBackupDue,
					daysSinceLastBackup: ttlStatus.daysSinceLastBackup,
					needsBackup: ttlStatus.needsBackup
				}
			}
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Trigger immediate log cleanup based on TTL
 */
export const triggerLogCleanup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { createBackupFirst = true, force = false, ttlOverrideDays } = req.body;

		const config = await SecurityConfig.findOne();
		const backupService = LogBackupService.getInstance();

		const ttlDaysFromConfig = config?.logBackup?.ttlDays || 60;
		const ttlDays =
			ttlOverrideDays !== undefined && !isNaN(Number(ttlOverrideDays)) && Number(ttlOverrideDays) > 0
				? Number(ttlOverrideDays)
				: ttlDaysFromConfig;

		// Calculate the cutoff date for log expiration
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - ttlDays);

		// Count logs to be deleted
		const logsToDelete = await Log.countDocuments({
			timestamp: { $lte: cutoffDate },
			action: { $ne: BackupEventType.LOG_CLEANUP_STARTED }
		});

		if (logsToDelete === 0 && !force) {
			return ApiRes(res, {
				status: HttpStatus.OK,
				msg: 'No logs need cleanup at this time',
				data: {
					logsDeleted: 0,
					backupCreated: false,
					forced: false,
					ttlDays,
					cutoffDate
				}
			});
		}

		let backupPath: string | null = null;
		let backupStats = null;

		// Create backup before deletion if requested
		if (createBackupFirst) {
			const backupConfig = await backupService.getBackupConfig();
			const backupResult = await backupService.createTTLBackup(backupConfig);
			backupPath = backupResult.backupPath;
			backupStats = backupResult.stats;

			await BackupLogger.backupCreated(backupPath, backupStats, req);
		}

		// Collect IDs first so an authorized retention cleanup also removes their
		// integrity manifests and is not reported as tampering.
		const logRecordsToDelete = await Log.find(
			{
				timestamp: { $lte: cutoffDate },
				action: { $ne: BackupEventType.LOG_CLEANUP_STARTED }
			},
			{ _id: 1 }
		).lean();
		const logIds = logRecordsToDelete.map((log) => log._id.toString());
		const cleanupAuditLogId = await BackupLogger.logRecordsCleanupStarted(logIds.length, ttlDays, req, {
			backupCreated: !!backupPath,
			backupPath,
			cleanupType: 'trigger_log_cleanup',
			cutoffDate,
			forced: force
		});

		// Delete only the records selected before the audit entry was created. The
		// explicit exclusion protects the cleanup audit log from this operation.
		const deleteResult = await Log.deleteMany({
			_id: { $in: logIds, $ne: cleanupAuditLogId }
		});
		if (logIds.length > 0) await SQLite.deleteByIds('Hash', logIds);

		await BackupLogger.backupCleanup(deleteResult.deletedCount, ttlDays, req);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: `Successfully cleaned up ${deleteResult.deletedCount} expired logs`,
			data: {
				logsDeleted: deleteResult.deletedCount,
				backupCreated: !!backupPath,
				backupPath,
				backupStats,
				forced: force,
				ttlDays,
				cutoffDate
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		BackupLogger.backupCleanupFailed(errorMessage, req);
		next(error);
	}
};

/**
 * Get log retention preview - shows what logs would be affected by TTL changes
 */
export const getRetentionPreview = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { ttlDays } = req.query;

		const proposedTTL = ttlDays ? parseInt(ttlDays as string) : null;

		if (proposedTTL !== null && (isNaN(proposedTTL) || proposedTTL < 1 || proposedTTL > 365)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'TTL days must be between 1 and 365'
			});
		}

		const config = await SecurityConfig.findOne();
		const currentTTL = config?.logBackup?.ttlDays || 60;
		const effectiveTTL = proposedTTL || currentTTL;

		// Calculate logs that would be affected
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - effectiveTTL);

		const logsToBeDeleted = await Log.countDocuments({
			timestamp: { $lte: cutoffDate }
		});

		const totalLogs = await Log.countDocuments();
		const logsToKeep = totalLogs - logsToBeDeleted;

		// Get breakdown by age
		const now = new Date();
		const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

		const logsLastWeek = await Log.countDocuments({ timestamp: { $gte: oneWeekAgo } });
		const logsLastMonth = await Log.countDocuments({ timestamp: { $gte: oneMonthAgo } });
		const logsLast3Months = await Log.countDocuments({ timestamp: { $gte: threeMonthsAgo } });

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Log retention preview retrieved successfully',
			data: {
				currentTTLDays: currentTTL,
				proposedTTLDays: effectiveTTL,
				effectiveCutoffDate: cutoffDate,
				impact: {
					totalLogs,
					logsToBeDeleted,
					logsToKeep,
					deletionPercentage: totalLogs > 0 ? Math.round((logsToBeDeleted / totalLogs) * 10000) / 100 : 0
				},
				ageDistribution: {
					lastWeek: logsLastWeek,
					lastMonth: logsLastMonth,
					last3Months: logsLast3Months,
					olderThan3Months: totalLogs - logsLast3Months
				}
			}
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Check storage threshold and return warning status
 * This endpoint checks if storage usage has exceeded the configured warning threshold
 */
export const checkStorageWarning = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const config = await SecurityConfig.findOne();

		const maxSizeBytes = config?.logBackup?.maxSizeBytes || 1024 * 1024 * 1024;
		const maxLogCount = config?.logBackup?.maxLogCount || 1000000;
		const warningThreshold = config?.logBackup?.warningThreshold || 0.8;
		const criticalThreshold = 0.95; // 95% is always critical

		// Get total log count
		const totalLogs = await Log.countDocuments();

		// Estimate storage size
		let estimatedSizeBytes = 0;
		try {
			const stats = await Log.collection.stats();
			estimatedSizeBytes = stats.size || 0;
		} catch {
			estimatedSizeBytes = totalLogs * 2048;
		}

		// Calculate usage percentages
		const storageUsagePercent = maxSizeBytes > 0 ? (estimatedSizeBytes / maxSizeBytes) * 100 : 0;
		const logCountUsagePercent = maxLogCount > 0 ? (totalLogs / maxLogCount) * 100 : 0;

		// Check thresholds for both storage and log count
		const isStorageWarningReached = storageUsagePercent >= warningThreshold * 100;
		const isStorageCriticalReached = storageUsagePercent >= criticalThreshold * 100;
		const isLogCountWarningReached = logCountUsagePercent >= warningThreshold * 100;
		const isLogCountCriticalReached = logCountUsagePercent >= criticalThreshold * 100;

		const isWarningThresholdReached = isStorageWarningReached || isLogCountWarningReached;
		const isCriticalThresholdReached = isStorageCriticalReached || isLogCountCriticalReached;

		// Determine warning level based on the highest severity
		let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
		const warningMessages: string[] = [];

		if (isStorageCriticalReached) {
			warningLevel = 'critical';
			warningMessages.push(`CRITICAL: Storage size has exceeded ${criticalThreshold * 100}%`);
		} else if (isStorageWarningReached) {
			warningLevel = 'warning';
			warningMessages.push(`WARNING: Storage size has exceeded ${warningThreshold * 100}%`);
		}

		if (isLogCountCriticalReached) {
			warningLevel = 'critical';
			warningMessages.push(`CRITICAL: Log count has exceeded ${criticalThreshold * 100}%`);
		} else if (isLogCountWarningReached) {
			if (warningLevel !== 'critical') warningLevel = 'warning';
			warningMessages.push(`WARNING: Log count has exceeded ${warningThreshold * 100}%`);
		}

		const warningMessage =
			warningMessages.length > 0
				? warningMessages.join('. ')
				: 'Storage and log count are within normal limits';

		// Log warnings
		if (isCriticalThresholdReached) {
			await BackupLogger.storageCriticalThresholdExceeded(
				{
					currentSizeBytes: estimatedSizeBytes,
					maxSizeBytes,
					usagePercent: Math.max(storageUsagePercent, logCountUsagePercent),
					totalLogs
				},
				req
			);
		} else if (isWarningThresholdReached) {
			await BackupLogger.storageWarningThresholdExceeded(
				{
					currentSizeBytes: estimatedSizeBytes,
					maxSizeBytes,
					usagePercent: Math.max(storageUsagePercent, logCountUsagePercent),
					warningThreshold,
					totalLogs
				},
				req
			);
		}

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: warningMessage,
			data: {
				warningLevel,
				isWarningThresholdReached,
				isCriticalThresholdReached,
				storage: {
					currentSizeBytes: estimatedSizeBytes,
					currentSizeFormatted: formatBytes(estimatedSizeBytes),
					maxSizeBytes,
					maxSizeFormatted: formatBytes(maxSizeBytes),
					usagePercent: Math.round(storageUsagePercent * 100) / 100,
					isWarningReached: isStorageWarningReached,
					isCriticalReached: isStorageCriticalReached,
					remainingBytes: Math.max(0, maxSizeBytes - estimatedSizeBytes),
					remainingFormatted: formatBytes(Math.max(0, maxSizeBytes - estimatedSizeBytes))
				},
				logCount: {
					currentCount: totalLogs,
					currentCountFormatted: formatNumber(totalLogs),
					maxLogCount,
					maxLogCountFormatted: formatNumber(maxLogCount),
					usagePercent: Math.round(logCountUsagePercent * 100) / 100,
					isWarningReached: isLogCountWarningReached,
					isCriticalReached: isLogCountCriticalReached,
					remainingLogs: Math.max(0, maxLogCount - totalLogs),
					remainingLogsFormatted: formatNumber(Math.max(0, maxLogCount - totalLogs))
				},
				thresholds: {
					warningThreshold: warningThreshold * 100,
					criticalThreshold: criticalThreshold * 100
				},
				recommendations:
					warningLevel === 'critical'
						? [
								'فوراً از لاگ‌های قدیمی بکاپ بگیرید',
								'فرآیند پاک‌سازی را برای حذف لاگ‌های منقضی اجرا کنید',
								'در صورت نیاز maxSizeBytes یا maxLogCount را افزایش دهید',
								'تنظیمات TTL را بررسی کنید تا دوره نگهداری لاگ کاهش یابد'
							]
						: warningLevel === 'warning'
							? [
									'به‌زودی یک بکاپ زمان‌بندی کنید',
									'پیش از رسیدن به آستانه بحرانی پاک‌سازی را اجرا کنید',
									'تنظیمات نگهداری لاگ را مرور کنید',
									'محدودیت‌های maxLogCount یا maxSizeBytes را در صورت نیاز تنظیم کنید'
								]
							: ['اقدام فوری نیاز نیست']
			}
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format number to human-readable string with commas
 */
function formatNumber(num: number): string {
	if (num >= 1000000000) {
		return (num / 1000000000).toFixed(2) + 'B';
	}
	if (num >= 1000000) {
		return (num / 1000000).toFixed(2) + 'M';
	}
	if (num >= 1000) {
		return (num / 1000).toFixed(2) + 'K';
	}
	return num.toLocaleString();
}
