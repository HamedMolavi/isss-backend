import { IsNumber, IsOptional, IsBoolean, Min, Max, IsInt } from 'class-validator';

/**
 * DTO for updating log TTL configuration
 */
export class UpdateLogTTLConfigDto {
	@IsOptional()
	@IsNumber()
	@IsInt()
	@Min(1, { message: 'TTL days must be at least 1 day' })
	@Max(365, { message: 'TTL days cannot exceed 365 days' })
	ttlDays?: number;

	@IsOptional()
	@IsNumber()
	@IsInt()
	@Min(1, { message: 'Backup interval must be at least 1 day' })
	@Max(90, { message: 'Backup interval cannot exceed 90 days' })
	backupIntervalDays?: number;

	@IsOptional()
	@IsNumber()
	@Min(1024 * 1024, { message: 'Max size must be at least 1MB (1048576 bytes)' })
	@Max(1024 * 1024 * 1024 * 10, { message: 'Max size cannot exceed 10GB' })
	maxSizeBytes?: number;

	@IsOptional()
	@IsNumber()
	@IsInt()
	@Min(1000, { message: 'Max log count must be at least 1000 logs' })
	@Max(100000000, { message: 'Max log count cannot exceed 100 million logs' })
	maxLogCount?: number;

	@IsOptional()
	@IsNumber()
	@Min(0.1, { message: 'Warning threshold must be at least 0.1 (10%)' })
	@Max(1, { message: 'Warning threshold cannot exceed 1 (100%)' })
	warningThreshold?: number;

	@IsOptional()
	@IsBoolean()
	autoBackup?: boolean;

	@IsOptional()
	@IsBoolean()
	autoCleanup?: boolean;

	@IsOptional()
	@IsNumber()
	@IsInt()
	@Min(1, { message: 'Check interval must be at least 1 hour' })
	@Max(168, { message: 'Check interval cannot exceed 168 hours (7 days)' })
	checkIntervalHours?: number;
}

/**
 * Interface for log storage statistics (for documentation purposes)
 */
export interface LogStorageStatsResponse {
	totalLogs: number;
	totalSizeBytes: number;
	oldestLogDate: Date | null;
	newestLogDate: Date | null;
	logsApproachingTTL: number;
	ttlDays: number;
	backupIntervalDays: number;
	maxSizeBytes: number;
	warningThreshold: number;
	autoBackup: boolean;
	autoCleanup: boolean;
	storageUsagePercent: number;
	isWarningThresholdReached: boolean;
	lastBackupDate: Date | null;
	nextBackupDue: Date | null;
}
