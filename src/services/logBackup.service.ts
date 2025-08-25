import { Log } from '../db/mongo/models/secLog';
import { LogType } from '../db/mongo/models/logType';
import { BackupLogger } from '../logger/backup.logger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import archiver from 'archiver';
import { Client as FtpClient } from 'basic-ftp';
import { SQLite } from '../db/sqlite';
import AdmZip from 'adm-zip';
import { getSecurityConfig } from '../config/security.config';

const pipelineAsync = promisify(pipeline);

export interface BackupConfig {
	ttlDays: number;
	isAutoBackup: boolean;
	ftpConfig?: {
		host: string;
		user: string;
		password: string;
		port?: number;
		secure?: boolean;
		path?: string;
	};
	backupIntervalDays?: number;
	lastBackupDate?: Date;
}

export interface BackupStats {
	totalLogs: number;
	backupSize: number;
	oldestLog: Date;
	newestLog: Date;
	backupDate: Date;
}

export interface RestoreResult {
	totalRestored: number;
	duplicatesSkipped: number;
	errors: number;
	// restoredLogs: Record<string, unknown>[];
}

export class LogBackupService {
	private static instance: LogBackupService;
	private backupDir: string;
	private lastBackupFile: string;

	constructor() {
		// Use environment variable for backup directory, fallback to default if not set
		this.backupDir = process.env.BACKUP_DIR_PATH || path.join(process.cwd(), 'backups');
		this.lastBackupFile = path.join(this.backupDir, 'last_backup.json');
		this.ensureBackupDirectory();
	}

	public static getInstance(): LogBackupService {
		if (!LogBackupService.instance) {
			LogBackupService.instance = new LogBackupService();
		}
		return LogBackupService.instance;
	}

	private ensureBackupDirectory(): void {
		if (!fs.existsSync(this.backupDir)) {
			fs.mkdirSync(this.backupDir, { recursive: true });
		}
	}

	/**
	 * Get last backup information
	 */
	private getLastBackupInfo(): { date: Date | null; intervalDays: number } {
		try {
			if (fs.existsSync(this.lastBackupFile)) {
				const data = JSON.parse(fs.readFileSync(this.lastBackupFile, 'utf8'));
				return {
					date: data.lastBackupDate ? new Date(data.lastBackupDate) : null,
					intervalDays: data.intervalDays || 30
				};
			}
		} catch (error) {
			BackupLogger.backupCreateFailed(error instanceof Error ? error.message : 'Unknown error');
		}
		return { date: null, intervalDays: 30 };
	}

	/**
	 * Update last backup information
	 */
	private updateLastBackupInfo(intervalDays: number): void {
		try {
			const backupInfo = {
				lastBackupDate: new Date().toISOString(),
				intervalDays
			};
			fs.writeFileSync(this.lastBackupFile, JSON.stringify(backupInfo, null, 2));
		} catch (error) {
			BackupLogger.backupCreateFailed(error instanceof Error ? error.message : 'Unknown error');
		}
	}

	/**
	 * Check if backup is needed based on interval and TTL
	 */
	public async checkTTLStatus(): Promise<{
		needsBackup: boolean;
		logsToExpire: number;
		daysUntilExpiry: number;
		daysSinceLastBackup: number;
		nextBackupDue: Date | null;
	}> {
		try {
			const config = await this.getBackupConfig();
			const lastBackupInfo = this.getLastBackupInfo();

			// Calculate days since last backup
			let daysSinceLastBackup = 0;
			let nextBackupDue: Date | null = null;

			if (lastBackupInfo.date) {
				const timeDiff = Date.now() - lastBackupInfo.date.getTime();
				daysSinceLastBackup = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
				nextBackupDue = new Date(
					lastBackupInfo.date.getTime() + (config.backupIntervalDays || 30) * 24 * 60 * 60 * 1000
				);
			}

			// Check for logs approaching TTL (within backup interval days)
			const ttlThreshold = new Date();
			ttlThreshold.setDate(ttlThreshold.getDate() + (config.backupIntervalDays || 30));

			const logsToExpire = await Log.countDocuments({
				expires_at: { $lte: ttlThreshold }
			});

			const oldestLog = await Log.findOne({}, {}, { sort: { expires_at: 1 } });

			let daysUntilExpiry = 0;
			if (oldestLog?.expires_at) {
				const timeDiff = oldestLog.expires_at.getTime() - Date.now();
				daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
			}

			// Backup is needed if:
			// 1. There are logs that will expire within the backup interval
			// 2. AND it's been at least the backup interval since last backup (or no backup yet)
			const intervalPassed = !lastBackupInfo.date || daysSinceLastBackup >= (config.backupIntervalDays || 30);
			const needsBackup = logsToExpire > 0 && intervalPassed;

			await BackupLogger.ttlBackupCompleted(
				'system_check',
				{
					totalLogs: logsToExpire,
					backupSize: 0,
					backupDate: new Date()
				},
				0
			);

			return {
				needsBackup,
				logsToExpire,
				daysUntilExpiry,
				daysSinceLastBackup,
				nextBackupDue
			};
		} catch (error) {
			BackupLogger.ttlBackupFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Create backup of logs that are about to expire
	 */
	public async createTTLBackup(config: BackupConfig): Promise<{
		backupPath: string;
		stats: BackupStats;
	}> {
		try {
			// Get logs that will expire within the backup interval
			const ttlThreshold = new Date();
			ttlThreshold.setDate(ttlThreshold.getDate() + (config.backupIntervalDays || 30));

			const logsToBackup = await Log.find({
				expires_at: { $lte: ttlThreshold }
			}).sort({ timestamp: 1 });

			if (logsToBackup.length === 0) {
				throw new Error('No logs found that need backup');
			}

			const backupFileName = `ttl_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
			const backupPath = path.join(this.backupDir, backupFileName);

			// Create backup file
			const backupData = {
				metadata: {
					backupType: 'ttl_cleanup',
					backupDate: new Date(),
					totalLogs: logsToBackup.length,
					ttlDays: config.ttlDays,
					backupIntervalDays: config.backupIntervalDays || 30,
					oldestLog: logsToBackup[0]?.timestamp,
					newestLog: logsToBackup[logsToBackup.length - 1]?.timestamp
				},
				logs: logsToBackup
			};

			await fs.promises.writeFile(backupPath, JSON.stringify(backupData, null, 2));

			const stats: BackupStats = {
				totalLogs: logsToBackup.length,
				backupSize: fs.statSync(backupPath).size,
				oldestLog: logsToBackup[0]?.timestamp || new Date(),
				newestLog: logsToBackup[logsToBackup.length - 1]?.timestamp || new Date(),
				backupDate: new Date()
			};

			// Update last backup info
			this.updateLastBackupInfo(config.backupIntervalDays || 30);

			// Use BackupLogger instead of direct Logger
			await BackupLogger.ttlBackupCompleted(backupPath, stats, 0);

			return { backupPath, stats };
		} catch (error) {
			// Use BackupLogger for error logging
			BackupLogger.ttlBackupFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Clean up logs that have been backed up
	 */
	public async cleanupBackedUpLogs(config: BackupConfig): Promise<number> {
		try {
			const ttlThreshold = new Date();
			ttlThreshold.setDate(ttlThreshold.getDate() + (config.backupIntervalDays || 30));

			// First, get the IDs of logs that will be deleted for SQLite cleanup
			const logsToDelete = await Log.find({ expires_at: { $lte: ttlThreshold } }, { _id: 1 }).lean();

			const logIds = logsToDelete.map((log) => log._id.toString());

			// Delete logs from MongoDB
			const result = await Log.deleteMany({
				expires_at: { $lte: ttlThreshold }
			});

			// Clean up corresponding hash records from SQLite
			if (logIds.length > 0) {
				try {
					const deletedHashCount = await SQLite.deleteByIds('Hash', logIds);
					await BackupLogger.backupCleanup(deletedHashCount, config.ttlDays);
				} catch (sqliteError) {
					BackupLogger.backupCleanupFailed(
						sqliteError instanceof Error ? sqliteError.message : 'Unknown error'
					);
					// Don't throw here - log deletion was successful, SQLite cleanup is secondary
				}
			}

			await BackupLogger.backupCleanup(result.deletedCount, config.ttlDays);
			return result.deletedCount;
		} catch (error) {
			BackupLogger.backupCleanupFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Validate backup file structure
	 */
	private validateBackupData(backupData: Record<string, unknown>): boolean {
		// Check if logs array exists and is an array
		if (!backupData.logs || !Array.isArray(backupData.logs)) {
			return false;
		}

		// Check if each log has required fields
		for (const log of backupData.logs) {
			if (typeof log !== 'object' || log === null) {
				return false;
			}

			const logObj = log as Record<string, unknown>;
			if (!logObj.timestamp || !logObj.message || !logObj.level) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Detect backup file type
	 */
	private getBackupFileType(filePath: string): 'json' | 'zip' | 'unsupported' {
		const fileExtension = path.extname(filePath).toLowerCase();

		if (fileExtension === '.json') {
			return 'json';
		} else if (fileExtension === '.zip') {
			return 'zip';
		} else {
			return 'unsupported';
		}
	}

	/**
	 * Restore logs from backup file (supports both .json and .zip formats)
	 */
	public async restoreFromBackup(
		backupPath: string,
		options?: {
			skipDuplicates?: boolean;
			dateRange?: { startDate: Date; endDate: Date };
		}
	): Promise<RestoreResult> {
		try {
			if (!fs.existsSync(backupPath)) {
				throw new Error('Backup file not found');
			}

			let backupContent: string;
			const fileType = this.getBackupFileType(backupPath);

			// Handle different file types
			if (fileType === 'zip') {
				// Extract backup.json from ZIP file
				try {
					const zip = new AdmZip(backupPath);
					const zipEntries = zip.getEntries();

					// Look for backup.json in the zip file
					const backupEntry = zipEntries.find((entry) => entry.entryName === 'backup.json');

					if (!backupEntry) {
						throw new Error('backup.json not found in ZIP file');
					}

					backupContent = backupEntry.getData().toString('utf8');
				} catch (zipError) {
					BackupLogger.backupCreateFailed(
						zipError instanceof Error ? zipError.message : 'ZIP extraction error'
					);
					throw new Error('Failed to extract backup from ZIP file');
				}
			} else if (fileType === 'json') {
				// Read JSON file directly
				backupContent = fs.readFileSync(backupPath, 'utf8');
			} else {
				throw new Error('Unsupported file format. Only .json and .zip files are supported');
			}

			let backupData: Record<string, unknown>;

			try {
				backupData = JSON.parse(backupContent);
			} catch (parseError) {
				BackupLogger.backupCreateFailed(parseError instanceof Error ? parseError.message : 'Unknown error');
				throw new Error('Invalid backup file format');
			}

			if (!this.validateBackupData(backupData)) {
				throw new Error('Backup file structure is invalid');
			}

			let logsToRestore = backupData.logs as Record<string, unknown>[];

			// Filter by date range if specified
			if (options?.dateRange) {
				logsToRestore = logsToRestore.filter((log: Record<string, unknown>) => {
					const logDate = new Date(log.timestamp as string);
					return logDate >= options.dateRange!.startDate && logDate <= options.dateRange!.endDate;
				});
			}

			const result: RestoreResult = {
				totalRestored: 0,
				duplicatesSkipped: 0,
				errors: 0
			};

			for (const logData of logsToRestore) {
				try {
					// Check for duplicates if skipDuplicates is enabled
					if (options?.skipDuplicates) {
						const existingLog = await Log.findOne({
							timestamp: logData.timestamp,
							message: logData.message,
							action: logData.action
						});

						if (existingLog) {
							result.duplicatesSkipped++;
							continue;
						}
					}

					// Create new log entry
					const newLog = new Log({
						level: logData.level,
						timestamp: logData.timestamp,
						message: logData.message,
						action: logData.action,
						metadata: logData.metadata,
						expires_at: logData.expires_at
					});

					await newLog.save();
					result.totalRestored++;
				} catch (logError) {
					result.errors++;
					BackupLogger.backupCreateFailed(logError instanceof Error ? logError.message : 'Unknown error');
				}
			}

			// Use BackupLogger for successful restore
			await BackupLogger.backupRestored(backupPath, result);

			return result;
		} catch (error) {
			// Use BackupLogger for error logging
			BackupLogger.backupRestoreFailed(backupPath, error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Stream backup file as download response
	 */
	public async streamBackupDownload(backupPath: string, res: Response): Promise<void> {
		try {
			if (!fs.existsSync(backupPath)) {
				throw new Error('Backup file not found');
			}

			const fileName = path.basename(backupPath);
			const stat = fs.statSync(backupPath);

			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
			res.setHeader('Content-Length', stat.size);

			const readStream = fs.createReadStream(backupPath);

			await pipelineAsync(readStream, res);

			// Use BackupLogger for successful download
			await BackupLogger.backupDownloaded(fileName, stat.size);
		} catch (error) {
			// Use BackupLogger for error logging
			BackupLogger.backupDownloadFailed(
				path.basename(backupPath),
				error instanceof Error ? error.message : 'Unknown error'
			);
			throw error;
		}
	}

	/**
	 * Create compressed backup archive
	 */
	public async createCompressedBackup(
		config: BackupConfig,
		dateRange?: {
			startDate: Date;
			endDate: Date;
		}
	): Promise<{ backupPath: string; stats: BackupStats }> {
		try {
			const query: Record<string, unknown> = {};

			if (dateRange) {
				query.timestamp = {
					$gte: dateRange.startDate,
					$lte: dateRange.endDate
				};
			}

			const logsToBackup = await Log.find(query).sort({ timestamp: 1 });

			if (logsToBackup.length === 0) {
				throw new Error('No logs found for backup');
			}

			const backupFileName = `compressed_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.zip`;
			const backupPath = path.join(this.backupDir, backupFileName);

			// Create zip archive
			const output = fs.createWriteStream(backupPath);
			const archive = archiver('zip', { zlib: { level: 9 } });

			archive.pipe(output);

			const backupData = {
				metadata: {
					backupType: 'compressed',
					backupDate: new Date(),
					totalLogs: logsToBackup.length,
					dateRange,
					oldestLog: logsToBackup[0]?.timestamp,
					newestLog: logsToBackup[logsToBackup.length - 1]?.timestamp
				},
				logs: logsToBackup
			};

			archive.append(JSON.stringify(backupData, null, 2), { name: 'backup.json' });
			await archive.finalize();

			const stats: BackupStats = {
				totalLogs: logsToBackup.length,
				backupSize: fs.statSync(backupPath).size,
				oldestLog: logsToBackup[0]?.timestamp || new Date(),
				newestLog: logsToBackup[logsToBackup.length - 1]?.timestamp || new Date(),
				backupDate: new Date()
			};

			// Use BackupLogger for successful compressed backup
			await BackupLogger.compressedBackupCreated(backupPath, stats);

			return { backupPath, stats };
		} catch (error) {
			// Use BackupLogger for error logging
			BackupLogger.compressedBackupFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Upload backup to FTP server
	 */
	public async uploadToFTP(
		backupPath: string,
		ftpConfig: NonNullable<BackupConfig['ftpConfig']>
	): Promise<void> {
		const client = new FtpClient();

		try {
			await client.access({
				host: ftpConfig.host,
				user: ftpConfig.user,
				password: ftpConfig.password,
				port: ftpConfig.port || 21,
				secure: ftpConfig.secure || false
			});

			if (ftpConfig.path) {
				await client.ensureDir(ftpConfig.path);
				await client.cd(ftpConfig.path);
			}

			const fileName = path.basename(backupPath);
			await client.uploadFrom(backupPath, fileName);

			// Use BackupLogger for successful FTP upload
			await BackupLogger.ftpUploadCompleted(fileName, ftpConfig.host, ftpConfig.path || '/');
		} catch (error) {
			// Use BackupLogger for error logging
			BackupLogger.ftpUploadFailed(
				path.basename(backupPath),
				ftpConfig.host,
				error instanceof Error ? error.message : 'Unknown error'
			);
			throw error;
		} finally {
			client.close();
		}
	}

	/**
	 * Perform automatic backup process
	 */
	public async performAutoBackup(config: BackupConfig): Promise<void> {
		try {
			if (!config.isAutoBackup) {
				return;
			}

			// Use BackupLogger for auto backup start
			await BackupLogger.autoBackupStarted(config);

			// Check if backup is needed
			const ttlStatus = await this.checkTTLStatus();

			if (!ttlStatus.needsBackup) {
				await BackupLogger.autoBackupCompleted(
					{
						totalLogs: 0,
						backupSize: 0
					},
					0,
					false
				);
				return;
			}

			// Create backup
			const { backupPath, stats } = await this.createTTLBackup(config);

			// Upload to FTP if configured
			if (config.ftpConfig) {
				await this.uploadToFTP(backupPath, config.ftpConfig);

				// Remove local backup after successful FTP upload
				fs.unlinkSync(backupPath);
				await BackupLogger.backupCleanup(1, 0);
			}

			// Clean up old logs
			const deletedCount = await this.cleanupBackedUpLogs(config);

			// Use BackupLogger for auto backup completion
			await BackupLogger.autoBackupCompleted(stats, deletedCount, !!config.ftpConfig);
		} catch (error) {
			// Use BackupLogger for error logging
			BackupLogger.autoBackupFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Get backup configuration from LogType
	 */
	public async getBackupConfig(): Promise<BackupConfig> {
		try {
			const logType = await LogType.findOne({ isActive: true });

			if (!logType) {
				throw new Error('No active LogType configuration found');
			}

			// Get TTL days from security configuration in database
			const securityConfig = await getSecurityConfig();
			const ttlDays = securityConfig.LOG_BACKUP.TTL_DAYS;

			const config: BackupConfig = {
				ttlDays,
				isAutoBackup: ((logType.toObject() as Record<string, unknown>).isAutoBackup as boolean) || false,
				backupIntervalDays: process.env.BACKUP_INTERVAL_DAYS ? parseInt(process.env.BACKUP_INTERVAL_DAYS) : 30
			};

			// Add FTP config if environment variables are set
			if (process.env.FTP_HOST && process.env.FTP_USER && process.env.FTP_PASSWORD) {
				config.ftpConfig = {
					host: process.env.FTP_HOST,
					user: process.env.FTP_USER,
					password: process.env.FTP_PASSWORD,
					port: process.env.FTP_PORT ? parseInt(process.env.FTP_PORT) : 21,
					secure: process.env.FTP_SECURE === 'true',
					path: process.env.FTP_PATH || '/backups'
				};
			}

			return config;
		} catch (error) {
			BackupLogger.backupCreateFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Clean up old backup files
	 */
	public async cleanupOldBackups(retentionDays: number = 7): Promise<number> {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

			const files = fs.readdirSync(this.backupDir);
			let deletedCount = 0;

			for (const file of files) {
				if (file === 'last_backup.json') continue; // Skip the tracking file

				const filePath = path.join(this.backupDir, file);
				const stats = fs.statSync(filePath);

				if (stats.mtime < cutoffDate) {
					fs.unlinkSync(filePath);
					deletedCount++;
				}
			}

			await BackupLogger.backupCleanup(deletedCount, retentionDays);

			return deletedCount;
		} catch (error) {
			BackupLogger.backupCleanupFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * List available backup files
	 */
	public async listBackupFiles(): Promise<
		Array<{
			fileName: string;
			filePath: string;
			size: number;
			createdDate: Date;
			type: 'json' | 'zip';
		}>
	> {
		try {
			const files = fs.readdirSync(this.backupDir);
			const backupFiles = [];

			for (const file of files) {
				if (file === 'last_backup.json') continue;

				const filePath = path.join(this.backupDir, file);
				const stats = fs.statSync(filePath);

				if (stats.isFile()) {
					backupFiles.push({
						fileName: file,
						filePath,
						size: stats.size,
						createdDate: stats.birthtime,
						type: file.endsWith('.zip') ? ('zip' as const) : ('json' as const)
					});
				}
			}

			return backupFiles.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());
		} catch (error) {
			BackupLogger.backupCreateFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}
}
