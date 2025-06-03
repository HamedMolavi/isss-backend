import { LogBackupService } from './logBackup.service';
import { Logger } from '../logger';
import { BackupSchedulerLogger } from '../logger/backupScheduler.logger';

export class BackupSchedulerService {
	private static instance: BackupSchedulerService;
	private intervalId: NodeJS.Timeout | null = null;
	private isRunning = false;

	constructor() {
		// Private constructor for singleton
	}

	public static getInstance(): BackupSchedulerService {
		if (!BackupSchedulerService.instance) {
			BackupSchedulerService.instance = new BackupSchedulerService();
		}
		return BackupSchedulerService.instance;
	}

	/**
	 * Start the backup scheduler
	 */
	public async start(): Promise<void> {
		if (this.isRunning) {
			Logger.warn('Backup scheduler is already running');
			return;
		}

		try {
			const backupService = LogBackupService.getInstance();
			const config = await backupService.getBackupConfig();

			if (!config.isAutoBackup) {
				Logger.info('Automatic backup is disabled, scheduler not started');
				return;
			}

			// Check daily instead of hourly (configurable via environment)
			const checkIntervalHours = process.env.BACKUP_CHECK_INTERVAL_HOURS
				? parseInt(process.env.BACKUP_CHECK_INTERVAL_HOURS)
				: 24;
			const checkInterval = checkIntervalHours * 60 * 60 * 1000; // Convert to milliseconds

			this.intervalId = setInterval(async () => {
				try {
					await this.performScheduledCheck();
				} catch (error) {
					// Use BackupSchedulerLogger for error logging
					BackupSchedulerLogger.scheduledCheckFailed(
						error instanceof Error ? error.message : 'Unknown error'
					);
				}
			}, checkInterval);

			this.isRunning = true;

			// Use BackupSchedulerLogger for successful start
			await BackupSchedulerLogger.schedulerStarted(checkIntervalHours, config.isAutoBackup);

			// Perform initial check
			await this.performScheduledCheck();
		} catch (error) {
			// Use BackupSchedulerLogger for error logging
			BackupSchedulerLogger.schedulerStartFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Stop the backup scheduler
	 */
	public async stop(): Promise<void> {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.isRunning = false;

		// Use BackupSchedulerLogger for stop
		await BackupSchedulerLogger.schedulerStopped();
	}

	/**
	 * Check if scheduler is running
	 */
	public isSchedulerRunning(): boolean {
		return this.isRunning;
	}

	/**
	 * Perform scheduled backup check with smart logic
	 */
	private async performScheduledCheck(): Promise<void> {
		try {
			const backupService = LogBackupService.getInstance();
			const config = await backupService.getBackupConfig();

			if (!config.isAutoBackup) {
				Logger.info('Automatic backup is disabled, skipping scheduled check');
				return;
			}

			// Use BackupSchedulerLogger for check start
			await BackupSchedulerLogger.scheduledCheckStarted();

			// Check TTL status with smart logic
			const ttlStatus = await backupService.checkTTLStatus();

			// Use BackupSchedulerLogger for TTL status evaluation
			await BackupSchedulerLogger.ttlStatusEvaluated(ttlStatus);

			if (ttlStatus.needsBackup) {
				// Use BackupSchedulerLogger for backup trigger
				await BackupSchedulerLogger.scheduledBackupTriggered(ttlStatus);

				await backupService.performAutoBackup(config);

				// Use BackupSchedulerLogger for backup completion
				await BackupSchedulerLogger.scheduledBackupCompleted(ttlStatus);
			} else {
				const reason =
					ttlStatus.logsToExpire === 0
						? 'No logs approaching expiration'
						: `Backup interval not reached (${ttlStatus.daysSinceLastBackup}/${config.backupIntervalDays || 30} days)`;

				// Use BackupSchedulerLogger for backup not needed
				await BackupSchedulerLogger.scheduledBackupNotNeeded(reason, ttlStatus);
			}

			// Use BackupSchedulerLogger for check completion
			await BackupSchedulerLogger.scheduledCheckCompleted(ttlStatus);
		} catch (error) {
			// Use BackupSchedulerLogger for error logging
			BackupSchedulerLogger.scheduledCheckFailed(error instanceof Error ? error.message : 'Unknown error');
		}
	}

	/**
	 * Force a backup check (for manual triggering)
	 */
	public async forceBackupCheck(): Promise<void> {
		// Use BackupSchedulerLogger for manual check trigger
		await BackupSchedulerLogger.manualCheckTriggered();

		await this.performScheduledCheck();
	}

	/**
	 * Restart the scheduler with new configuration
	 */
	public async restart(): Promise<void> {
		// Use BackupSchedulerLogger for restart
		await BackupSchedulerLogger.schedulerRestarted();

		await this.stop();
		await this.start();
	}

	/**
	 * Get scheduler status
	 */
	public async getStatus(): Promise<{
		isRunning: boolean;
		nextCheck?: Date;
		intervalHours?: number;
	}> {
		const status = {
			isRunning: this.isRunning
		};

		if (this.isRunning && this.intervalId) {
			const intervalHours = process.env.BACKUP_CHECK_INTERVAL_HOURS
				? parseInt(process.env.BACKUP_CHECK_INTERVAL_HOURS)
				: 24;

			const fullStatus = {
				...status,
				intervalHours,
				nextCheck: new Date(Date.now() + intervalHours * 60 * 60 * 1000)
			};

			// Use BackupSchedulerLogger for status check
			await BackupSchedulerLogger.schedulerStatus(fullStatus);

			return fullStatus;
		}

		return status;
	}
}
