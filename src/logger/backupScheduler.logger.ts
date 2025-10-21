import { Request } from 'express';
import { Logger } from '.';
import { LogType } from '../db/mongo/models/logType';
import { LOG_TYPE_KEYS } from '../types/enums/logType.enum';

/**
 * Backup scheduler event types
 */
export enum BackupSchedulerEventType {
	SCHEDULER_STARTED = 'scheduler_started',
	SCHEDULER_START_FAILED = 'scheduler_start_failed',
	SCHEDULER_STOPPED = 'scheduler_stopped',
	SCHEDULER_RESTARTED = 'scheduler_restarted',
	SCHEDULED_CHECK_STARTED = 'scheduled_check_started',
	SCHEDULED_CHECK_COMPLETED = 'scheduled_check_completed',
	SCHEDULED_CHECK_FAILED = 'scheduled_check_failed',
	SCHEDULED_BACKUP_TRIGGERED = 'scheduled_backup_triggered',
	SCHEDULED_BACKUP_COMPLETED = 'scheduled_backup_completed',
	SCHEDULED_BACKUP_NOT_NEEDED = 'scheduled_backup_not_needed',
	MANUAL_CHECK_TRIGGERED = 'manual_check_triggered',
	TTL_STATUS_EVALUATED = 'ttl_status_evaluated'
}

/**
 * Backup scheduler logger
 */
export class BackupSchedulerLogger {
	private static createBaseLogData(
		action: string,
		success: boolean,
		req?: Request,
		type: string = 'backup_scheduler'
	) {
		return {
			type,
			action,
			success,
			userid: req?.user?._id?.toString() || 'system',
			username: req?.user?.username || 'system',
			ip: req?.ip || req?.socket?.remoteAddress || 'system',
			userAgent: req?.get('User-Agent') || 'system',
			method: req?.method || 'SYSTEM',
			url: req?.originalUrl || 'system_operation',
			timestamp: new Date(),
			component: 'backup_scheduler',
			operation: action
		};
	}

	/**
	 * Log successful scheduler start
	 */
	static async schedulerStarted(
		checkIntervalHours: number,
		isAutoBackup: boolean,
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Backup scheduler started', {
					...this.createBaseLogData(BackupSchedulerEventType.SCHEDULER_STARTED, true, req),
					details: {
						checkIntervalHours,
						isAutoBackup,
						nextCheckIn: `${checkIntervalHours} hours`,
						operation: 'start_scheduler'
					}
				});
			}
		} catch (error) {
			console.error('Error logging scheduler start:', error);
		}
	}

	/**
	 * Log failed scheduler start
	 */
	static schedulerStartFailed(error: string, req?: Request): void {
		Logger.error('Failed to start backup scheduler', {
			...this.createBaseLogData(BackupSchedulerEventType.SCHEDULER_START_FAILED, false, req),
			details: {
				error,
				operation: 'start_scheduler',
				failureReason: error
			}
		});
	}

	/**
	 * Log scheduler stop
	 */
	static async schedulerStopped(req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Backup scheduler stopped', {
					...this.createBaseLogData(BackupSchedulerEventType.SCHEDULER_STOPPED, true, req),
					details: {
						operation: 'stop_scheduler',
						reason: 'Manual stop'
					}
				});
			}
		} catch (error) {
			console.error('Error logging scheduler stop:', error);
		}
	}

	/**
	 * Log scheduler restart
	 */
	static async schedulerRestarted(req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Backup scheduler restarted', {
					...this.createBaseLogData(BackupSchedulerEventType.SCHEDULER_RESTARTED, true, req),
					details: {
						operation: 'restart_scheduler',
						reason: 'Configuration change or manual restart'
					}
				});
			}
		} catch (error) {
			console.error('Error logging scheduler restart:', error);
		}
	}

	/**
	 * Log scheduled check start
	 */
	static async scheduledCheckStarted(req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Performing scheduled backup check', {
					...this.createBaseLogData(BackupSchedulerEventType.SCHEDULED_CHECK_STARTED, true, req),
					details: {
						operation: 'scheduled_check',
						phase: 'start',
						checkType: 'automatic'
					}
				});
			}
		} catch (error) {
			console.error('Error logging scheduled check start:', error);
		}
	}

	/**
	 * Log scheduled check completion
	 */
	static async scheduledCheckCompleted(
		ttlStatus: {
			needsBackup: boolean;
			logsToExpire: number;
			daysUntilExpiry: number;
			daysSinceLastBackup: number;
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Scheduled backup check completed', {
					...this.createBaseLogData(BackupSchedulerEventType.SCHEDULED_CHECK_COMPLETED, true, req),
					details: {
						operation: 'scheduled_check',
						phase: 'complete',
						checkType: 'automatic',
						needsBackup: ttlStatus.needsBackup,
						logsToExpire: ttlStatus.logsToExpire,
						daysUntilExpiry: ttlStatus.daysUntilExpiry,
						daysSinceLastBackup: ttlStatus.daysSinceLastBackup
					}
				});
			}
		} catch (error) {
			console.error('Error logging scheduled check completion:', error);
		}
	}

	/**
	 * Log scheduled check failure
	 */
	static scheduledCheckFailed(error: string, req?: Request): void {
		Logger.error('Error during scheduled backup check', {
			...this.createBaseLogData(BackupSchedulerEventType.SCHEDULED_CHECK_FAILED, false, req),
			details: {
				error,
				operation: 'scheduled_check',
				phase: 'failed',
				checkType: 'automatic',
				failureReason: error
			}
		});
	}

	/**
	 * Log backup triggered by scheduler
	 */
	static async scheduledBackupTriggered(
		ttlStatus: {
			needsBackup: boolean;
			logsToExpire: number;
			daysUntilExpiry: number;
			daysSinceLastBackup: number;
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('TTL backup needed, starting automatic backup', {
					...this.createBaseLogData(BackupSchedulerEventType.SCHEDULED_BACKUP_TRIGGERED, true, req),
					details: {
						operation: 'trigger_backup',
						triggeredBy: 'scheduler',
						logsToExpire: ttlStatus.logsToExpire,
						daysUntilExpiry: ttlStatus.daysUntilExpiry,
						daysSinceLastBackup: ttlStatus.daysSinceLastBackup,
						reason: 'TTL expiration approaching'
					}
				});
			}
		} catch (error) {
			console.error('Error logging scheduled backup trigger:', error);
		}
	}

	/**
	 * Log successful scheduled backup completion
	 */
	static async scheduledBackupCompleted(
		ttlStatus: {
			needsBackup: boolean;
			logsToExpire: number;
			daysUntilExpiry: number;
			daysSinceLastBackup: number;
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Scheduled backup completed successfully', {
					...this.createBaseLogData(BackupSchedulerEventType.SCHEDULED_BACKUP_COMPLETED, true, req),
					details: {
						operation: 'complete_backup',
						triggeredBy: 'scheduler',
						originalLogsToExpire: ttlStatus.logsToExpire,
						originalDaysUntilExpiry: ttlStatus.daysUntilExpiry,
						phase: 'complete'
					}
				});
			}
		} catch (error) {
			console.error('Error logging scheduled backup completion:', error);
		}
	}

	/**
	 * Log when backup is not needed
	 */
	static async scheduledBackupNotNeeded(
		reason: string,
		ttlStatus: {
			needsBackup: boolean;
			logsToExpire: number;
			daysUntilExpiry: number;
			daysSinceLastBackup: number;
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('No backup needed during scheduled check', {
					...this.createBaseLogData(BackupSchedulerEventType.SCHEDULED_BACKUP_NOT_NEEDED, true, req),
					details: {
						operation: 'evaluate_backup_need',
						reason,
						logsToExpire: ttlStatus.logsToExpire,
						daysUntilExpiry: ttlStatus.daysUntilExpiry,
						daysSinceLastBackup: ttlStatus.daysSinceLastBackup,
						needsBackup: ttlStatus.needsBackup
					}
				});
			}
		} catch (error) {
			console.error('Error logging backup not needed:', error);
		}
	}

	/**
	 * Log manual backup check trigger
	 */
	static async manualCheckTriggered(req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Manual backup check triggered', {
					...this.createBaseLogData(BackupSchedulerEventType.MANUAL_CHECK_TRIGGERED, true, req),
					details: {
						operation: 'manual_check',
						triggeredBy: req?.user?.username || 'system',
						checkType: 'manual'
					}
				});
			}
		} catch (error) {
			console.error('Error logging manual check trigger:', error);
		}
	}

	/**
	 * Log TTL status evaluation
	 */
	static async ttlStatusEvaluated(
		ttlStatus: {
			needsBackup: boolean;
			logsToExpire: number;
			daysUntilExpiry: number;
			daysSinceLastBackup: number;
			nextBackupDue: Date | null;
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('TTL status check results', {
					...this.createBaseLogData(BackupSchedulerEventType.TTL_STATUS_EVALUATED, true, req),
					details: {
						operation: 'ttl_evaluation',
						needsBackup: ttlStatus.needsBackup,
						logsToExpire: ttlStatus.logsToExpire,
						daysUntilExpiry: ttlStatus.daysUntilExpiry,
						daysSinceLastBackup: ttlStatus.daysSinceLastBackup,
						nextBackupDue: ttlStatus.nextBackupDue?.toISOString()
					}
				});
			}
		} catch (error) {
			console.error('Error logging TTL status evaluation:', error);
		}
	}

	/**
	 * Log scheduler status information
	 */
	static async schedulerStatus(
		status: {
			isRunning: boolean;
			nextCheck?: Date;
			intervalHours?: number;
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Backup scheduler status check', {
					...this.createBaseLogData('scheduler_status_check', true, req),
					details: {
						operation: 'status_check',
						isRunning: status.isRunning,
						intervalHours: status.intervalHours,
						nextCheck: status.nextCheck?.toISOString(),
						schedulerActive: status.isRunning
					}
				});
			}
		} catch (error) {
			console.error('Error logging scheduler status:', error);
		}
	}
}
