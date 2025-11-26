import * as fs from 'fs';
import * as path from 'path';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import S3Client from '../config/s3.config';
import { Logger } from '../logger';
import { BackupLogger } from '../logger/backup.logger';
import { BaseConfig } from '../config/base.config';
import si from 'systeminformation';
import BackupJob, { BackupStorageType, BackupJobStatus } from '../db/mongo/models/backupJob';

const execAsync = promisify(exec);

export interface SystemBackupOptions {
	includeMongoDB?: boolean;
	includeElasticsearch?: boolean;
	includeMinIO?: boolean;
	includeFrame?: boolean; // If true, automatically include frame folder in MinIO and frame_log in Elasticsearch
	mongoDBCollections?: string[];
	elasticsearchIndices?: string[];
	minIOBuckets?: string[];
	minIOFolders?: Record<string, string[]>; // Bucket name -> array of folder prefixes (e.g., { "isss-images": ["images/crop", "images/frame"] })
	externalDrivePath?: string;
}

export interface SystemBackupResult {
	backupPath: string;
	backupSize: number;
	downloadUrl?: string;
	externalCopyPath?: string;
	components: {
		mongodb?: {
			success: boolean;
			size: number;
			collections?: number;
			error?: string;
		};
		elasticsearch?: {
			success: boolean;
			size: number;
			indices?: number;
			error?: string;
		};
		minio?: {
			success: boolean;
			size: number;
			buckets?: number;
			objects?: number;
			error?: string;
		};
		minioUpload?: {
			success: boolean;
			size: number;
			path: string;
			error?: string;
		};
		externalDrive?: {
			success: boolean;
			size?: number;
			path?: string;
			error?: string;
		};
	};
	metadata: {
		backupDate: Date;
		backupType: 'system';
		externalDrivePath?: string;
	};
}

export interface SystemRestoreOptions {
	backupPath: string;
	restoreMongoDB?: boolean;
	restoreElasticsearch?: boolean;
	restoreMinIO?: boolean;
	skipExisting?: boolean;
}

export interface SystemRestoreResult {
	success: boolean;
	components: {
		mongodb?: {
			success: boolean;
			restored?: number;
			error?: string;
		};
		elasticsearch?: {
			success: boolean;
			restored?: number;
			error?: string;
		};
		minio?: {
			success: boolean;
			restored?: number;
			error?: string;
		};
	};
	error?: string;
}

export interface StorageCheckResult {
	hasEnoughSpace: boolean;
	availableSpace: number; // in bytes
	estimatedBackupSize: number; // in bytes
	requiredSpace: number; // in bytes (with 20% buffer)
	error?: string;
}

export interface BackupEstimate {
	estimatedSize: number; // in bytes (uncompressed)
	estimatedCompressedSize: number; // in bytes (estimated after zip compression)
	compressionRatio: number; // estimated compression ratio (e.g., 0.3 = 30% of original)
	estimatedDurationSeconds: number; // in seconds
	estimatedCompletionTime: Date; // calculated from startTime
	storageCheck: StorageCheckResult;
}

// Constants
const FRAME_INDEX = process.env.FRAME_INDEX || 'frame_log';
const FRAME_FOLDER = 'images/frame';

export class SystemBackupService {
	private static instance: SystemBackupService;
	private backupDir: string;
	private cleanupInterval: NodeJS.Timeout | null = null;
	private static readonly BACKUP_TTL_DAYS = 15;

	constructor() {
		this.backupDir = process.env.BACKUP_DIR_PATH || path.join(process.cwd(), 'backups', 'system');
		fs.mkdirSync(this.backupDir, { recursive: true });
	}

	public static getInstance(): SystemBackupService {
		if (!SystemBackupService.instance) {
			SystemBackupService.instance = new SystemBackupService();
			// Start background cleanup (runs every 24 hours)
			SystemBackupService.instance.startBackgroundCleanup();
			// Setup MinIO lifecycle policy
			SystemBackupService.instance.setupMinIOLifecyclePolicy().catch((err) => {
				Logger.warn('Failed to setup MinIO lifecycle policy', { error: err });
			});
		}
		return SystemBackupService.instance;
	}

	/**
	 * Start background cleanup task (runs daily)
	 */
	private startBackgroundCleanup(): void {
		// Run cleanup every 24 hours
		const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

		// Run first cleanup after 1 minute (let app fully start)
		setTimeout(() => {
			this.cleanupExpiredBackups().catch((err) => {
				Logger.error('Background cleanup failed', { error: err });
			});
		}, 60 * 1000);

		// Then run every 24 hours
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpiredBackups().catch((err) => {
				Logger.error('Background cleanup failed', { error: err });
			});
		}, CLEANUP_INTERVAL);

		Logger.info('Background backup cleanup scheduled (every 24 hours)');
	}

	/**
	 * Setup MinIO bucket lifecycle policy for automatic expiration
	 */
	private async setupMinIOLifecyclePolicy(): Promise<void> {
		try {
			const s3Client = S3Client.instance();

			// Ensure backup bucket exists
			try {
				await s3Client.headBucket({ Bucket: 'backup' });
			} catch {
				await s3Client.createBucket({ Bucket: 'backup' });
				Logger.info('Created backup bucket');
			}

			// Set lifecycle policy to expire objects after 15 days
			await s3Client.putBucketLifecycleConfiguration({
				Bucket: 'backup',
				LifecycleConfiguration: {
					Rules: [
						{
							ID: 'ExpireBackupsAfter15Days',
							Status: 'Enabled' as const,
							Filter: {
								Prefix: 'backups/'
							},
							Expiration: {
								Days: SystemBackupService.BACKUP_TTL_DAYS
							}
						}
					]
				}
			});

			Logger.info(
				`MinIO lifecycle policy set: backups expire after ${SystemBackupService.BACKUP_TTL_DAYS} days`
			);
		} catch (error) {
			Logger.warn('Could not set MinIO lifecycle policy (MinIO may not support it)', { error });
		}
	}

	/**
	 * Clean up expired backups from MinIO (backups older than 15 days)
	 * Returns count of deleted backups
	 */
	public async cleanupExpiredBackups(): Promise<{
		deleted: number;
		failed: number;
		details: Array<{ jobId: string; backupPath: string; status: 'deleted' | 'failed'; error?: string }>;
	}> {
		Logger.info('Starting cleanup of expired MinIO backups...');
		const result = {
			deleted: 0,
			failed: 0,
			details: [] as Array<{
				jobId: string;
				backupPath: string;
				status: 'deleted' | 'failed';
				error?: string;
			}>
		};

		try {
			// Find all MinIO backups that have expired and not yet deleted
			const expiredBackups = await BackupJob.find({
				storageType: BackupStorageType.MINIO,
				status: BackupJobStatus.COMPLETED,
				expiresAt: { $lte: new Date() },
				isDeleted: { $ne: true }
			});

			Logger.info(`Found ${expiredBackups.length} expired backups to clean up`);

			const s3Client = S3Client.instance();

			for (const backup of expiredBackups) {
				const backupPath = backup.result?.backupPath;
				if (!backupPath) {
					Logger.warn(`Backup ${backup.jobId} has no backup path, marking as deleted`);
					await BackupJob.findByIdAndUpdate(backup._id, { isDeleted: true, deletedAt: new Date() });
					continue;
				}

				try {
					// Parse S3 path: s3://bucket/key
					let bucket = 'backup';
					let key = backupPath;

					if (backupPath.startsWith('s3://')) {
						const pathWithoutProtocol = backupPath.replace('s3://', '');
						const slashIndex = pathWithoutProtocol.indexOf('/');
						bucket = pathWithoutProtocol.substring(0, slashIndex);
						key = pathWithoutProtocol.substring(slashIndex + 1);
					}

					// Delete from MinIO
					await s3Client.deleteObject({ Bucket: bucket, Key: key });
					Logger.info(`Deleted backup from MinIO: ${backupPath}`);

					// Mark as deleted in DB
					await BackupJob.findByIdAndUpdate(backup._id, {
						isDeleted: true,
						deletedAt: new Date()
					});

					result.deleted++;
					result.details.push({ jobId: backup.jobId, backupPath, status: 'deleted' });
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : 'Unknown error';
					Logger.error(`Failed to delete backup ${backup.jobId}: ${errorMsg}`);
					result.failed++;
					result.details.push({ jobId: backup.jobId, backupPath, status: 'failed', error: errorMsg });
				}
			}

			Logger.info(`Cleanup completed. Deleted: ${result.deleted}, Failed: ${result.failed}`);
			return result;
		} catch (error) {
			Logger.error('Failed to cleanup expired backups', { error });
			throw error;
		}
	}

	private async copyBackupToExternalDrive(sourcePath: string, externalDrivePath: string): Promise<string> {
		const resolvedExternalDir = path.resolve(externalDrivePath);

		if (!fs.existsSync(resolvedExternalDir)) {
			throw new Error(`External drive path "${resolvedExternalDir}" does not exist`);
		}

		const stats = fs.statSync(resolvedExternalDir);

		if (!stats.isDirectory()) {
			throw new Error(`External drive path "${resolvedExternalDir}" must be a directory`);
		}

		const backupFileSize = fs.statSync(sourcePath).size;
		const availableSpace = await this.getAvailableSpaceForPath(resolvedExternalDir);

		if (availableSpace !== Number.MAX_SAFE_INTEGER && availableSpace < backupFileSize * 1.1) {
			throw new Error(
				`Insufficient space on external drive. Required: ${(backupFileSize / 1024 / 1024 / 1024).toFixed(2)} GB, ` +
					`Available: ${(availableSpace / 1024 / 1024 / 1024).toFixed(2)} GB`
			);
		}

		let destinationPath = path.join(resolvedExternalDir, path.basename(sourcePath));
		if (fs.existsSync(destinationPath)) {
			const parsed = path.parse(destinationPath);
			destinationPath = path.join(parsed.dir, `${parsed.name}_${Date.now()}${parsed.ext}`);
		}

		await fs.promises.copyFile(sourcePath, destinationPath);
		Logger.info('Backup copied to external drive', { destinationPath });
		return destinationPath;
	}

	/**
	 * Get available disk space for backup directory
	 */
	private async getAvailableDiskSpace(): Promise<number> {
		return this.getAvailableSpaceForPath(this.backupDir);
	}

	private async getAvailableSpaceForPath(targetPath: string): Promise<number> {
		try {
			const fsStats = await si.fsSize();
			const resolvedPath = path.resolve(targetPath);

			const matchingFs = fsStats
				.filter((fsEntry) => resolvedPath.startsWith(fsEntry.mount))
				.sort((a, b) => b.mount.length - a.mount.length)[0];

			if (!matchingFs) {
				// Fallback: use the first filesystem
				return fsStats[0]?.available ? fsStats[0].available * 1024 : 0;
			}

			return matchingFs.available * 1024; // Convert from KB to bytes
		} catch (error) {
			Logger.warn('Failed to get disk space information', { error, targetPath });
			// Fallback: return a large number to allow backup to proceed
			return Number.MAX_SAFE_INTEGER;
		}
	}

	public async estimateBackupSize(options: SystemBackupOptions): Promise<number> {
		let size = 0;
		if (options.includeMongoDB) size += await this.estimateMongoSize(options.mongoDBCollections);
		if (options.includeElasticsearch) size += await this.estimateElasticsearchSize(options);
		// Skip MinIO estimation - too slow for large buckets, user ensures sufficient space
		return size;
	}

	private async estimateMongoSize(collections?: string[]): Promise<number> {
		try {
			const db = mongoose.connection.db;
			if (!db || mongoose.connection.readyState !== 1) return 0;

			const colList = collections || (await db.listCollections().toArray()).map((c) => c.name);
			let size = 0;
			for (const name of colList) {
				try {
					const stats = await db.collection(name).stats();
					size += (stats.size || 0) * 1.3; // JSON overhead
				} catch {
					/* ignore */
				}
			}
			return size;
		} catch {
			return 0;
		}
	}

	private async estimateElasticsearchSize(options: SystemBackupOptions): Promise<number> {
		if (!process.esclient) return 0;
		try {
			let indices = options.elasticsearchIndices || (await this.getElasticsearchIndices());
			indices = this.filterFrameIndex(indices, options.includeFrame);

			let size = 0;
			for (const index of indices) {
				try {
					const stats = await process.esclient.indices.stats({ index });
					size += (stats.indices?.[index]?.total?.store?.size_in_bytes || 0) * 1.2;
				} catch {
					/* ignore */
				}
			}
			return size;
		} catch {
			return 0;
		}
	}

	private async getElasticsearchIndices(): Promise<string[]> {
		if (!process.esclient) return [];
		try {
			const res = await process.esclient.cat.indices({ format: 'json' });
			return (Array.isArray(res) ? res : [])
				.filter((i) => i.index && !i.index.startsWith('.'))
				.map((i) => i.index!);
		} catch {
			const res = await process.esclient.indices.get({ index: '*' });
			return Object.keys(res).filter((i) => !i.startsWith('.'));
		}
	}

	private filterFrameIndex(indices: string[], includeFrame?: boolean): string[] {
		if (includeFrame) return indices;
		return indices.filter((i) => i !== FRAME_INDEX);
	}

	private filterFrameFolders(folders: string[], includeFrame?: boolean): string[] {
		if (includeFrame) return folders;
		return folders.filter((f) => f !== FRAME_FOLDER && !f.startsWith(FRAME_FOLDER + '/'));
	}

	public async checkStorageAvailability(options: SystemBackupOptions): Promise<StorageCheckResult> {
		try {
			const availableSpace = await this.getAvailableDiskSpace();
			const estimatedSize = await this.estimateBackupSize(options);
			const requiredSpace = estimatedSize * 1.2;
			return {
				hasEnoughSpace: availableSpace >= requiredSpace,
				availableSpace,
				estimatedBackupSize: estimatedSize,
				requiredSpace
			};
		} catch (error) {
			return {
				hasEnoughSpace: false,
				availableSpace: 0,
				estimatedBackupSize: 0,
				requiredSpace: 0,
				error: (error as Error).message
			};
		}
	}

	public async estimateBackupTime(options: SystemBackupOptions, startTime: Date): Promise<BackupEstimate> {
		const estimatedSize = await this.estimateBackupSize(options);
		const storageCheck = await this.checkStorageAvailability(options);

		// Speed: MongoDB 80MB/s, MinIO 20MB/s, mixed 25-30MB/s
		let speed = 30 * 1024 * 1024;
		if (options.includeMongoDB && !options.includeElasticsearch && !options.includeMinIO)
			speed = 80 * 1024 * 1024;
		else if (!options.includeMongoDB && !options.includeElasticsearch && options.includeMinIO)
			speed = 20 * 1024 * 1024;
		else if (options.includeMongoDB && options.includeElasticsearch && options.includeMinIO)
			speed = 25 * 1024 * 1024;

		// Compression: text 0.25, binary 0.85, mixed 0.55
		let ratio = 0.55;
		if (options.includeMongoDB && options.includeElasticsearch && !options.includeMinIO) ratio = 0.25;
		else if (!options.includeMongoDB && !options.includeElasticsearch && options.includeMinIO) ratio = 0.85;

		const estimatedDurationSeconds = Math.max(1, Math.ceil((estimatedSize / speed) * 1.1));
		return {
			estimatedSize,
			estimatedCompressedSize: Math.ceil(estimatedSize * ratio),
			compressionRatio: ratio,
			estimatedDurationSeconds,
			estimatedCompletionTime: new Date(startTime.getTime() + estimatedDurationSeconds * 1000),
			storageCheck
		};
	}

	/**
	 * Create a system backup of MongoDB, Elasticsearch, and MinIO
	 * @param options - Backup options
	 * @param startTime - Optional start time for completion estimation (defaults to now)
	 * @param onProgress - Optional progress callback
	 * @param isCancelled - Optional function to check if backup should be cancelled
	 */
	public async createSystemBackup(
		options: SystemBackupOptions = {},
		_startTime?: Date,
		onProgress?: (stage: string, percentage: number, details?: Record<string, string>) => void,
		isCancelled?: () => boolean
	): Promise<SystemBackupResult> {
		// Check storage availability before starting backup (skip if onProgress is provided, already checked)
		if (!onProgress) {
			const storageCheck = await this.checkStorageAvailability(options);
			if (!storageCheck.hasEnoughSpace) {
				throw new Error(
					`Insufficient storage space. Required: ${(storageCheck.requiredSpace / 1024 / 1024 / 1024).toFixed(2)} GB, ` +
						`Available: ${(storageCheck.availableSpace / 1024 / 1024 / 1024).toFixed(2)} GB`
				);
			}
		}

		// Check for cancellation at the start
		if (isCancelled && isCancelled()) {
			throw new Error('Backup cancelled by user');
		}

		if (onProgress) {
			onProgress('preparing', 5);
		}

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
		} = options;

		// If externalDrivePath is provided, save to external drive only; otherwise save to MinIO
		const useExternalDrive = externalDrivePath && externalDrivePath.trim().length > 0;
		const normalizedExternalPath = useExternalDrive ? externalDrivePath.trim() : undefined;

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupDirName = `system_backup_${timestamp}`;
		const tempBackupDir = path.join(this.backupDir, backupDirName);
		const backupFileName = `${backupDirName}.zip`;
		const localBackupPath = path.join(this.backupDir, backupFileName);
		const minioBackupKey = `backups/${backupFileName}`;

		fs.mkdirSync(tempBackupDir, { recursive: true });

		const result: SystemBackupResult = {
			backupPath: minioBackupKey,
			backupSize: 0,
			components: {},
			metadata: {
				backupDate: new Date(),
				backupType: 'system'
			}
		};

		try {
			// Backup MongoDB, Elasticsearch, and MinIO in parallel
			const backupPromises: Promise<void>[] = [];
			const progressBase = 15;

			if (includeMongoDB) {
				if (onProgress) {
					onProgress('backing_up_mongodb', progressBase, { mongodb: 'Starting MongoDB backup...' });
				}
				backupPromises.push(
					(async () => {
						try {
							// Check cancellation before starting MongoDB backup
							if (isCancelled && isCancelled()) {
								throw new Error('Backup cancelled by user');
							}
							await this.backupMongoDB(tempBackupDir, mongoDBCollections, isCancelled);
							const mongoSize = this.getDirectorySize(path.join(tempBackupDir, 'mongodb'));
							result.components.mongodb = {
								success: true,
								size: mongoSize
							};
							if (onProgress) {
								onProgress('backing_up_mongodb', progressBase + 25, { mongodb: 'MongoDB backup completed' });
							}
						} catch (error) {
							result.components.mongodb = {
								success: false,
								size: 0,
								error: error instanceof Error ? error.message : 'Unknown error'
							};
							Logger.error('MongoDB backup failed', { error });
							if (onProgress) {
								onProgress('backing_up_mongodb', progressBase + 25, { mongodb: 'MongoDB backup failed' });
							}
						}
					})()
				);
			}

			if (includeElasticsearch) {
				if (onProgress) {
					onProgress('backing_up_elasticsearch', progressBase + (includeMongoDB ? 25 : 0), {
						elasticsearch: 'Starting Elasticsearch backup...'
					});
				}
				backupPromises.push(
					(async () => {
						try {
							// Check cancellation before starting Elasticsearch backup
							if (isCancelled && isCancelled()) {
								throw new Error('Backup cancelled by user');
							}
							const frameIndex = process.env.FRAME_INDEX || 'frame_log';
							let indicesToBackup = elasticsearchIndices ? [...elasticsearchIndices] : undefined;

							// Handle frame index based on includeFrame filter
							if (indicesToBackup) {
								// User specified specific indices
								if (includeFrame) {
									// Add frame_log index if not already present
									if (!indicesToBackup.includes(frameIndex)) {
										indicesToBackup.push(frameIndex);
									}
								} else {
									// Remove frame_log index if present
									indicesToBackup = indicesToBackup.filter((idx) => idx !== frameIndex);
								}
							}

							await this.backupElasticsearch(tempBackupDir, indicesToBackup, !includeFrame, isCancelled);
							const esSize = this.getDirectorySize(path.join(tempBackupDir, 'elasticsearch'));
							result.components.elasticsearch = {
								success: true,
								size: esSize
							};
							if (onProgress) {
								onProgress('backing_up_elasticsearch', progressBase + (includeMongoDB ? 50 : 25), {
									elasticsearch: 'Elasticsearch backup completed'
								});
							}
						} catch (error) {
							result.components.elasticsearch = {
								success: false,
								size: 0,
								error: error instanceof Error ? error.message : 'Unknown error'
							};
							Logger.error('Elasticsearch backup failed', { error });
							if (onProgress) {
								onProgress('backing_up_elasticsearch', progressBase + (includeMongoDB ? 50 : 25), {
									elasticsearch: 'Elasticsearch backup failed'
								});
							}
						}
					})()
				);
			}

			if (includeMinIO) {
				if (onProgress) {
					onProgress(
						'backing_up_minio',
						progressBase +
							(includeMongoDB && includeElasticsearch ? 50 : includeMongoDB || includeElasticsearch ? 25 : 0),
						{ minio: 'Starting MinIO backup...' }
					);
				}
				backupPromises.push(
					(async () => {
						try {
							// Check cancellation before starting MinIO backup
							if (isCancelled && isCancelled()) {
								throw new Error('Backup cancelled by user');
							}
							const bucketName = BaseConfig.BUCKET_NAME;
							const frameFolder = 'images/frame';

							// Handle frame folder based on includeFrame filter
							const foldersToBackup = minIOFolders ? { ...minIOFolders } : undefined;

							if (foldersToBackup) {
								// User specified specific folders
								if (includeFrame) {
									// Add frame folder if not already present
									if (!foldersToBackup[bucketName]) {
										foldersToBackup[bucketName] = [];
									}
									if (!foldersToBackup[bucketName].includes(frameFolder)) {
										foldersToBackup[bucketName].push(frameFolder);
									}
								} else {
									// Remove frame folder if present
									if (foldersToBackup[bucketName]) {
										foldersToBackup[bucketName] = foldersToBackup[bucketName].filter(
											(folder: string) => folder !== frameFolder && !folder.startsWith(frameFolder + '/')
										);
										// Remove bucket entry if empty
										if (foldersToBackup[bucketName].length === 0) {
											delete foldersToBackup[bucketName];
										}
									}
								}
							}

							const minioResult = await this.backupMinIO(
								tempBackupDir,
								minIOBuckets,
								foldersToBackup,
								!includeFrame,
								isCancelled
							);
							const minioSize = this.getDirectorySize(path.join(tempBackupDir, 'minio'));
							result.components.minio = {
								success: true,
								size: minioSize,
								buckets: minioResult.buckets,
								objects: minioResult.objects
							};
							if (onProgress) {
								onProgress(
									'backing_up_minio',
									progressBase +
										(includeMongoDB && includeElasticsearch
											? 75
											: includeMongoDB || includeElasticsearch
												? 50
												: 25),
									{ minio: 'MinIO backup completed' }
								);
							}
						} catch (error) {
							result.components.minio = {
								success: false,
								size: 0,
								error: error instanceof Error ? error.message : 'Unknown error'
							};
							Logger.error('MinIO backup failed', { error });
							if (onProgress) {
								onProgress(
									'backing_up_minio',
									progressBase +
										(includeMongoDB && includeElasticsearch
											? 75
											: includeMongoDB || includeElasticsearch
												? 50
												: 25),
									{ minio: 'MinIO backup failed' }
								);
							}
						}
					})()
				);
			}

			// Wait for all backup operations to complete in parallel
			await Promise.all(backupPromises);

			// Check for cancellation after backup operations
			if (isCancelled && isCancelled()) {
				throw new Error('Backup cancelled by user');
			}

			if (onProgress) {
				onProgress('creating_archive', 85, { archive: 'Creating compressed archive...' });
			}

			// Create metadata file
			const metadata = {
				backupDate: new Date().toISOString(),
				backupType: 'system',
				components: result.components,
				options
			};
			fs.writeFileSync(path.join(tempBackupDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

			if (onProgress) {
				onProgress('creating_archive', 90, { archive: 'Compressing archive...' });
			}

			// Create zip archive
			await this.createZipArchive(tempBackupDir, localBackupPath);

			if (onProgress) {
				onProgress('finalizing', 95, { archive: 'Archive created, cleaning up...' });
			}

			// Remove temporary directory
			fs.rmSync(tempBackupDir, { recursive: true, force: true });

			result.backupSize = fs.statSync(localBackupPath).size;

			if (useExternalDrive && normalizedExternalPath) {
				// Save to external drive only
				if (onProgress) {
					onProgress('copying_to_external', 95, { external: 'Copying backup to external drive...' });
				}

				const externalBackupPath = await this.copyBackupToExternalDrive(
					localBackupPath,
					normalizedExternalPath
				);
				Logger.info(`Backup copied to external drive: ${externalBackupPath}`);

				// Remove local backup file after copy
				try {
					fs.unlinkSync(localBackupPath);
					Logger.info('Local backup file removed after copy to external drive');
				} catch (cleanupError) {
					Logger.warn('Failed to remove local backup file', { error: cleanupError });
				}

				result.backupPath = externalBackupPath;
				result.externalCopyPath = externalBackupPath;
				result.metadata.externalDrivePath = normalizedExternalPath;

				if (onProgress) {
					onProgress('completed', 100, { message: 'Backup saved to external drive successfully' });
				}
			} else {
				// Upload backup to MinIO 'backup' bucket
				if (onProgress) {
					onProgress('uploading_to_minio', 95, { minio: 'Uploading backup to MinIO...' });
				}

				Logger.info(`Uploading backup to MinIO bucket 'backup' with key: ${minioBackupKey}`);
				const s3Client = S3Client.instance();

				// Ensure 'backup' bucket exists
				try {
					await s3Client.headBucket({ Bucket: 'backup' });
					Logger.info('Backup bucket already exists');
				} catch {
					Logger.info('Creating backup bucket...');
					await s3Client.createBucket({ Bucket: 'backup' });
					Logger.info('Backup bucket created successfully');
				}

				// Upload the backup file with public read access
				const fileStream = fs.createReadStream(localBackupPath);
				await s3Client.putObject({
					Bucket: 'backup',
					Key: minioBackupKey,
					Body: fileStream,
					ContentType: 'application/zip',
					ACL: 'public-read'
				});

				Logger.info(`Backup uploaded successfully to MinIO: ${minioBackupKey}`);

				// Remove local backup file after upload
				try {
					fs.unlinkSync(localBackupPath);
					Logger.info('Local backup file removed after upload');
				} catch (cleanupError) {
					Logger.warn('Failed to remove local backup file', { error: cleanupError });
				}

				// Generate download URL for MinIO
				const minioEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
				const downloadUrl = `${minioEndpoint}/backup/${minioBackupKey}`;
				Logger.info(`Download URL: ${downloadUrl}`);

				result.components.minioUpload = {
					success: true,
					size: result.backupSize,
					path: `s3://backup/${minioBackupKey}`
				};

				result.backupPath = `s3://backup/${minioBackupKey}`;
				result.downloadUrl = downloadUrl;

				if (onProgress) {
					onProgress('completed', 100, { message: 'Backup uploaded to MinIO successfully' });
				}
			}

			await BackupLogger.backupCreated(
				result.backupPath,
				{
					totalLogs: 0,
					backupSize: result.backupSize,
					backupDate: result.metadata.backupDate
				},
				undefined
			);

			return result;
		} catch (error) {
			// Cleanup on error
			if (fs.existsSync(tempBackupDir)) {
				fs.rmSync(tempBackupDir, { recursive: true, force: true });
			}
			if (fs.existsSync(localBackupPath)) {
				fs.unlinkSync(localBackupPath);
			}
			throw error;
		}
	}

	/**
	 * Backup MongoDB collections
	 */
	private async backupMongoDB(
		backupDir: string,
		collections?: string[],
		isCancelled?: () => boolean
	): Promise<void> {
		Logger.info('Starting MongoDB backup...');
		const mongoDir = path.join(backupDir, 'mongodb');
		fs.mkdirSync(mongoDir, { recursive: true });

		// Get MongoDB connection URL from environment
		const mongoUrl = process.env.MONGODB_URL;
		if (!mongoUrl) {
			throw new Error('MONGODB_URL not configured');
		}

		try {
			// Check for cancellation
			if (isCancelled && isCancelled()) {
				Logger.info('MongoDB backup cancelled by user');
				throw new Error('Backup cancelled by user');
			}
			await this.backupMongoDBViaMongoose(mongoDir, collections, isCancelled);
			Logger.info('MongoDB backup via Mongoose completed successfully');
		} catch (error) {
			Logger.error('MongoDB backup via Mongoose failed', { error });
			throw error;
		}
	}

	private async backupMongoDBViaMongoose(
		backupDir: string,
		collections?: string[],
		isCancelled?: () => boolean
	): Promise<void> {
		Logger.info('Starting MongoDB backup via Mongoose...');
		const connection = mongoose.connection;
		if (connection.readyState !== 1) {
			throw new Error('MongoDB connection not established');
		}

		// Get database - use the client to ensure we have the correct db
		const client = connection.getClient();
		const dbName = connection.db?.databaseName || connection.name;
		Logger.info(`MongoDB database name: ${dbName}`);

		const db = client.db(dbName);
		if (!db) {
			throw new Error('MongoDB database instance not available');
		}

		// List all collections
		const allCollections = await db.listCollections().toArray();
		Logger.info(`Raw collections from listCollections: ${JSON.stringify(allCollections.map((c) => c.name))}`);

		const collectionsList = collections || allCollections;
		const collectionsToBackup = collectionsList.map((c: string | { name: string }) =>
			typeof c === 'string' ? c : c.name
		);
		Logger.info(
			`Found ${collectionsToBackup.length} collections to backup: ${collectionsToBackup.join(', ')}`
		);

		if (collectionsToBackup.length === 0) {
			Logger.warn('No collections found to backup!');
			// Create empty manifest
			const manifest = { collections: [], backupDate: new Date().toISOString() };
			fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
			return;
		}

		// Backup each collection to a separate file
		for (const collectionName of collectionsToBackup) {
			if (isCancelled && isCancelled()) {
				Logger.info('MongoDB backup cancelled by user');
				throw new Error('Backup cancelled by user');
			}

			Logger.info(`Starting backup of collection: ${collectionName}`);
			try {
				const collection = db.collection(collectionName);
				const docCount = await collection.countDocuments();
				Logger.info(`Collection ${collectionName} has ${docCount} documents`);

				if (docCount === 0) {
					Logger.info(`Skipping empty collection: ${collectionName}`);
					// Write empty array for empty collections
					fs.writeFileSync(path.join(backupDir, `${collectionName}.json`), '[]');
					continue;
				}

				const collectionFile = path.join(backupDir, `${collectionName}.json`);
				const writeStream = fs.createWriteStream(collectionFile);

				// Attach listeners before writing
				const writePromise = new Promise<void>((resolve, reject) => {
					writeStream.on('finish', resolve);
					writeStream.on('error', reject);
				});

				// Start JSON array
				writeStream.write('[\n');

				const cursor = collection.find({});
				let isFirst = true;
				let written = 0;

				for await (const doc of cursor) {
					if (written % 1000 === 0 && isCancelled && isCancelled()) {
						Logger.info(`Backup cancelled during collection: ${collectionName}`);
						writeStream.end();
						throw new Error('Backup cancelled by user');
					}

					if (!isFirst) {
						writeStream.write(',\n');
					}
					isFirst = false;

					writeStream.write('  ' + JSON.stringify(doc, null, 2).replace(/\n/g, '\n  '));
					written++;

					if (written % 5000 === 0) {
						Logger.info(`Progress for ${collectionName}: ${written}/${docCount} documents`);
					}
				}

				// Close JSON array
				writeStream.write('\n]');
				writeStream.end();

				// Wait for write to complete
				await writePromise;

				Logger.info(`Successfully backed up ${written} documents from collection: ${collectionName}`);
			} catch (error) {
				Logger.error(`Failed to backup collection: ${collectionName}`, { error });
				throw error;
			}
		}

		Logger.info('MongoDB backup via Mongoose completed successfully');

		// Create manifest file
		const manifest = { collections: collectionsToBackup, backupDate: new Date().toISOString() };
		fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
	}

	/**
	 * Backup Elasticsearch indices
	 * @param backupDir - Directory to store backup
	 * @param indices - Optional array of specific indices to backup (if undefined, backs up all except frame_log)
	 * @param excludeFrame - If true, exclude frame_log index even if not specified
	 * @param isCancelled - Optional function to check if backup should be cancelled
	 */
	private async backupElasticsearch(
		backupDir: string,
		indices?: string[],
		excludeFrame?: boolean,
		isCancelled?: () => boolean
	): Promise<void> {
		Logger.info('Starting Elasticsearch backup...');
		const esDir = path.join(backupDir, 'elasticsearch');
		fs.mkdirSync(esDir, { recursive: true });

		if (!process.esclient) {
			throw new Error('Elasticsearch client not initialized');
		}

		const frameIndex = process.env.FRAME_INDEX || 'frame_log';

		// Get all indices if not specified
		let indicesToBackup: string[] = [];

		if (indices && indices.length > 0) {
			// Use specified indices
			indicesToBackup = indices;
			Logger.info(`Backing up specified indices: ${indices.join(', ')}`);
		} else {
			// Get all indices
			Logger.info('Fetching all Elasticsearch indices...');
			try {
				const indicesResponse = await process.esclient.cat.indices({ format: 'json' });
				const indicesArray = Array.isArray(indicesResponse) ? indicesResponse : [];
				indicesToBackup = indicesArray
					.filter((idx) => idx.index && !idx.index.startsWith('.'))
					.map((idx) => idx.index!)
					.filter((idx): idx is string => typeof idx === 'string');
			} catch {
				// Fallback to list indices API
				Logger.info('Using fallback indices API...');
				const indicesResponse = await process.esclient.indices.get({ index: '*' });
				indicesToBackup = Object.keys(indicesResponse).filter((idx) => !idx.startsWith('.'));
			}

			// Exclude frame_log if excludeFrame is true
			if (excludeFrame) {
				indicesToBackup = indicesToBackup.filter((idx) => idx !== frameIndex);
				Logger.info(`Excluding frame index: ${frameIndex}`);
			}
			Logger.info(`Found ${indicesToBackup.length} indices to backup: ${indicesToBackup.join(', ')}`);
		}

		const MAX_DOCUMENTS_PER_INDEX = 100000; // Safety limit

		for (const index of indicesToBackup) {
			// Check for cancellation before each index
			if (isCancelled && isCancelled()) {
				Logger.info('Elasticsearch backup cancelled by user');
				throw new Error('Backup cancelled by user');
			}

			Logger.info(`Starting backup of index: ${index}`);
			try {
				// Get index mapping
				Logger.info(`Fetching mapping for index: ${index}`);
				const mappingResponse = await process.esclient.indices.getMapping({ index });
				const indexMappings = mappingResponse[index];
				const mappings = indexMappings?.mappings;

				const indexFile = path.join(esDir, `${index}.json`);
				const writeStream = fs.createWriteStream(indexFile);

				// Write index metadata and start documents array
				writeStream.write(
					JSON.stringify(
						{
							mapping: mappings as Record<string, unknown>,
							documents: []
						},
						null,
						2
					).replace('[]', '[\n')
				);

				// Use scroll API to avoid fielddata restrictions on _id sorting
				const pageSize = 1000; // Smaller batches for better memory management
				const scrollTimeout = '2m';
				let totalFetched = 0;
				let scrollId: string | undefined;
				let isFirstBatch = true;

				try {
					Logger.info(`Starting scroll search for index: ${index}`);
					let searchResult = await process.esclient.search({
						index,
						size: pageSize,
						scroll: scrollTimeout,
						body: {
							query: {
								match_all: {}
							}
						}
					});

					while (totalFetched < MAX_DOCUMENTS_PER_INDEX) {
						// Check for cancellation periodically
						if (isCancelled && isCancelled()) {
							Logger.info(`Backup cancelled during index: ${index}`);
							writeStream.end();
							throw new Error('Backup cancelled by user');
						}

						const hits = searchResult.hits?.hits || [];
						if (hits.length === 0) {
							Logger.info(`No more documents for index: ${index}`);
							break;
						}

						// Stream write documents to avoid memory issues
						for (const hit of hits) {
							const doc = {
								_id: hit._id as string,
								_source: hit._source as Record<string, unknown>
							};

							if (!isFirstBatch) {
								writeStream.write(',\n');
							}
							isFirstBatch = false;
							writeStream.write('  ' + JSON.stringify(doc, null, 2).replace(/\n/g, '\n  '));
						}

						totalFetched += hits.length;

						// Log progress every 5000 documents
						if (totalFetched % 5000 === 0) {
							Logger.info(`Progress for ${index}: ${totalFetched} documents backed up`);
						}

						if (hits.length < pageSize) {
							Logger.info(`Reached end of index: ${index}`);
							break; // No more documents
						}

						scrollId = searchResult._scroll_id as string | undefined;
						if (!scrollId) {
							Logger.warn(`No scroll ID returned for index: ${index}`);
							break;
						}

						Logger.info(`Fetching next batch for ${index}...`);
						searchResult = await process.esclient.scroll({
							scroll_id: scrollId,
							scroll: scrollTimeout
						});
					}

					// Close the documents array and the JSON object
					writeStream.write('\n  ]\n}');
					writeStream.end();

					await new Promise<void>((resolve, reject) => {
						writeStream.on('finish', resolve);
						writeStream.on('error', reject);
					});
				} finally {
					if (scrollId) {
						Logger.info(`Clearing scroll for index: ${index}`);
						await process.esclient.clearScroll({ scroll_id: scrollId }).catch((error) => {
							Logger.warn(`Failed to clear scroll for index ${index}`, { error });
						});
					}
				}

				Logger.info(`Successfully backed up ${totalFetched} documents from index: ${index}`);
			} catch (error) {
				Logger.error(`Failed to backup index: ${index}`, { error });
				throw error; // Re-throw to stop backup process
			}
		}

		Logger.info('Elasticsearch backup completed successfully');
	}

	/**
	 * Backup MinIO buckets - MANIFEST ONLY (no data download)
	 * Creates a manifest file with metadata about all objects
	 * @param backupDir - Directory to store manifest
	 * @param buckets - Optional array of bucket names to backup
	 * @param folders - Optional map of bucket name to array of folder prefixes to backup
	 * @param excludeFrame - If true, exclude frame folder even if not specified in folders
	 * @param isCancelled - Optional function to check if backup should be cancelled
	 */
	private async backupMinIO(
		backupDir: string,
		buckets?: string[],
		folders?: Record<string, string[]>,
		excludeFrame?: boolean,
		isCancelled?: () => boolean
	): Promise<{ buckets: number; objects: number }> {
		Logger.info('Starting MinIO manifest backup (no data download)...');
		const minioDir = path.join(backupDir, 'minio');
		fs.mkdirSync(minioDir, { recursive: true });

		const s3Client = S3Client.instance();

		// Get all buckets if not specified
		let bucketsToBackup: string[] = [];

		if (buckets && buckets.length > 0) {
			bucketsToBackup = buckets;
			Logger.info(`Creating manifest for specified buckets: ${buckets.join(', ')}`);
		} else {
			Logger.info('Fetching all MinIO buckets...');
			const bucketsResponse = await s3Client.listBuckets({});
			bucketsToBackup = bucketsResponse.Buckets?.map((b) => b.Name || '') || [];
			Logger.info(`Found ${bucketsToBackup.length} buckets for manifest: ${bucketsToBackup.join(', ')}`);
		}

		const manifest: {
			backupDate: string;
			backupType: 'manifest-only';
			note: string;
			buckets: Array<{
				name: string;
				objects: Array<{
					key: string;
					size: number;
					lastModified: string;
					etag?: string;
				}>;
				totalSize: number;
				objectCount: number;
			}>;
		} = {
			backupDate: new Date().toISOString(),
			backupType: 'manifest-only',
			note: 'This is a manifest-only backup. Actual MinIO data remains in the original buckets. Use this manifest to verify data integrity or for external backup reference.',
			buckets: []
		};

		let totalObjects = 0;

		for (const bucketName of bucketsToBackup) {
			// Check for cancellation before each bucket
			if (isCancelled && isCancelled()) {
				Logger.info('MinIO manifest backup cancelled by user');
				throw new Error('Backup cancelled by user');
			}

			Logger.info(`Creating manifest for bucket: ${bucketName}`);
			try {
				const bucketManifest: {
					name: string;
					objects: Array<{
						key: string;
						size: number;
						lastModified: string;
						etag?: string;
					}>;
					totalSize: number;
					objectCount: number;
				} = {
					name: bucketName,
					objects: [],
					totalSize: 0,
					objectCount: 0
				};

				// Get folders/prefixes for this bucket
				const bucketFolders = folders?.[bucketName];
				const prefixFilter = excludeFrame ? 'images/frame' : undefined;

				// List all objects in bucket
				let continuationToken: string | undefined;
				do {
					if (isCancelled && isCancelled()) {
						throw new Error('Backup cancelled by user');
					}

					const listParams: {
						Bucket: string;
						MaxKeys?: number;
						ContinuationToken?: string;
					} = {
						Bucket: bucketName,
						MaxKeys: 1000
					};

					if (continuationToken) {
						listParams.ContinuationToken = continuationToken;
					}

					const listResponse = await s3Client.listObjectsV2(listParams);
					const objects = (listResponse.Contents || []).filter((object) => {
						if (!object.Key) return false;
						// Skip folder markers
						if (object.Key.endsWith('/') && (!object.Size || object.Size === 0)) return false;

						// Filter by folders if specified
						if (bucketFolders && bucketFolders.length > 0) {
							const matchesFolder = bucketFolders.some((folder) => {
								const prefix = folder.endsWith('/') ? folder : `${folder}/`;
								return object.Key === prefix || object.Key!.startsWith(prefix);
							});
							if (!matchesFolder) return false;
						}

						// Skip excluded prefix
						if (prefixFilter && (object.Key === prefixFilter || object.Key.startsWith(prefixFilter + '/'))) {
							return false;
						}

						return true;
					});

					// Add objects to manifest
					for (const object of objects) {
						bucketManifest.objects.push({
							key: object.Key!,
							size: object.Size || 0,
							lastModified: object.LastModified?.toISOString() || '',
							etag: object.ETag
						});
						bucketManifest.totalSize += object.Size || 0;
						bucketManifest.objectCount++;
						totalObjects++;
					}

					continuationToken = listResponse.NextContinuationToken;

					if (bucketManifest.objectCount % 1000 === 0 && bucketManifest.objectCount > 0) {
						Logger.info(
							`Manifest progress for ${bucketName}: ${bucketManifest.objectCount} objects cataloged`
						);
					}
				} while (continuationToken);

				manifest.buckets.push(bucketManifest);
				Logger.info(
					`Completed manifest for ${bucketName}: ${bucketManifest.objectCount} objects, ${(bucketManifest.totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`
				);
			} catch (error) {
				// Check if it's a cancellation error
				if (error instanceof Error && error.message === 'Backup cancelled by user') {
					throw error;
				}
				Logger.error(`Failed to create manifest for bucket: ${bucketName}`, { error });
			}
		}

		// Save manifest to file
		const manifestPath = path.join(minioDir, 'manifest.json');
		fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

		Logger.info(
			`MinIO manifest backup completed: ${bucketsToBackup.length} buckets, ${totalObjects} objects cataloged`
		);
		Logger.info(`Manifest saved to: ${manifestPath}`);

		return {
			buckets: bucketsToBackup.length,
			objects: totalObjects
		};
	}

	// NOTE: Old MinIO download methods removed - now using manifest-only backup
	// MinIO data stays in place, only metadata is backed up
	// For actual MinIO data backup to external drive, use the separate MinIO export feature

	/**
	 * Get all external drives/mount points in the system
	 */
	public async getExternalDrives(): Promise<
		Array<{
			name: string;
			mountPoint: string;
			size: number;
			used: number;
			available: number;
			usagePercentage: number;
			filesystem: string;
		}>
	> {
		const drives: Array<{
			name: string;
			mountPoint: string;
			size: number;
			used: number;
			available: number;
			usagePercentage: number;
			filesystem: string;
		}> = [];

		try {
			// Use df command to get disk information
			// -B1 for bytes, -T for filesystem type
			const output = execSync('df -B1 -T', { encoding: 'utf-8' });
			const lines = output.trim().split('\n');

			// Skip header line
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i].trim();
				if (!line) continue;

				// Parse df output: Filesystem Type Size Used Avail Use% Mounted
				const parts = line.split(/\s+/);
				if (parts.length < 7) continue;

				const filesystem = parts[0];
				const type = parts[1];
				const size = parseInt(parts[2], 10);
				const used = parseInt(parts[3], 10);
				const available = parseInt(parts[4], 10);
				const usagePercentage = parseInt(parts[5].replace('%', ''), 10);
				const mountPoint = parts.slice(6).join(' ');

				// Filter for external drives (exclude system partitions)
				// Include: /media, /mnt, /run/media, USB drives
				// Exclude: tmpfs, devtmpfs, loop devices, system partitions
				const isExternalDrive =
					(mountPoint.startsWith('/media/') ||
						mountPoint.startsWith('/mnt/') ||
						mountPoint.startsWith('/run/media/')) &&
					!type.includes('tmpfs') &&
					!type.includes('devtmpfs') &&
					!filesystem.startsWith('/dev/loop') &&
					size > 0;

				if (isExternalDrive) {
					drives.push({
						name: filesystem.split('/').pop() || filesystem,
						mountPoint,
						size,
						used,
						available,
						usagePercentage,
						filesystem: type
					});
				}
			}

			Logger.info(`Found ${drives.length} external drives`);
			return drives;
		} catch (error) {
			Logger.error('Failed to get external drives', { error });
			// Return empty array instead of throwing to handle gracefully
			return [];
		}
	}

	/**
	 * Export MinIO data to external drive
	 * @param externalDrivePath - Path to external drive
	 * @param buckets - Optional array of bucket names to export
	 * @param folders - Optional map of bucket name to array of folder prefixes to export
	 * @param onProgress - Optional progress callback
	 * @param isCancelled - Optional function to check if export should be cancelled
	 */
	public async exportMinIOToExternalDrive(
		externalDrivePath: string,
		buckets?: string[],
		folders?: Record<string, string[]>,
		onProgress?: (stage: string, percentage: number, details?: Record<string, string>) => void,
		isCancelled?: () => boolean
	): Promise<{
		success: boolean;
		exportPath: string;
		totalSize: number;
		totalObjects: number;
		buckets: number;
	}> {
		Logger.info('=== Starting MinIO Export to External Drive ===');
		Logger.info(`External drive path: ${externalDrivePath}`);
		Logger.info(`Specified buckets: ${buckets?.join(', ') || 'all'}`);
		Logger.info(`Specified folders: ${folders ? JSON.stringify(folders) : 'all'}`);

		// Validate external drive path
		if (!fs.existsSync(externalDrivePath)) {
			throw new Error(`External drive path does not exist: ${externalDrivePath}`);
		}

		// Create export directory with timestamp
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const exportDirName = `minio_export_${timestamp}`;
		const exportPath = path.join(externalDrivePath, exportDirName);
		fs.mkdirSync(exportPath, { recursive: true });

		Logger.info(`Export directory created: ${exportPath}`);

		const s3Client = S3Client.instance();

		// Get all buckets if not specified
		let bucketsToExport: string[] = [];

		if (buckets && buckets.length > 0) {
			bucketsToExport = buckets;
			Logger.info(`Exporting specified buckets: ${buckets.join(', ')}`);
		} else {
			Logger.info('Fetching all MinIO buckets...');
			const bucketsResponse = await s3Client.listBuckets({});
			bucketsToExport = bucketsResponse.Buckets?.map((b) => b.Name || '') || [];
			Logger.info(`Found ${bucketsToExport.length} buckets to export: ${bucketsToExport.join(', ')}`);
		}

		let totalObjects = 0;
		let totalSize = 0;
		const CONCURRENCY_LIMIT = 10; // Download 10 objects in parallel

		for (let bucketIndex = 0; bucketIndex < bucketsToExport.length; bucketIndex++) {
			const bucketName = bucketsToExport[bucketIndex];

			// Check for cancellation
			if (isCancelled && isCancelled()) {
				Logger.info('MinIO export cancelled by user');
				throw new Error('Export cancelled by user');
			}

			Logger.info(`Exporting bucket ${bucketIndex + 1}/${bucketsToExport.length}: ${bucketName}`);

			if (onProgress) {
				const bucketProgress = Math.floor((bucketIndex / bucketsToExport.length) * 100);
				onProgress('exporting_minio', bucketProgress, {
					bucket: bucketName,
					status: `Exporting bucket ${bucketIndex + 1}/${bucketsToExport.length}`
				});
			}

			try {
				const bucketDir = path.join(exportPath, bucketName);
				fs.mkdirSync(bucketDir, { recursive: true });

				// Get folders/prefixes for this bucket
				const bucketFolders = folders?.[bucketName];

				// List all objects to export
				let continuationToken: string | undefined;
				const objectsToExport: Array<{ Key: string; Size: number }> = [];

				do {
					if (isCancelled && isCancelled()) {
						throw new Error('Export cancelled by user');
					}

					const listParams: {
						Bucket: string;
						MaxKeys?: number;
						ContinuationToken?: string;
						Prefix?: string;
					} = {
						Bucket: bucketName,
						MaxKeys: 1000
					};

					if (continuationToken) {
						listParams.ContinuationToken = continuationToken;
					}

					const listResponse = await s3Client.listObjectsV2(listParams);
					const objects = (listResponse.Contents || []).filter((object) => {
						if (!object.Key) return false;
						// Skip folder markers
						if (object.Key.endsWith('/') && (!object.Size || object.Size === 0)) return false;

						// Filter by folders if specified
						if (bucketFolders && bucketFolders.length > 0) {
							const matchesFolder = bucketFolders.some((folder) => {
								const prefix = folder.endsWith('/') ? folder : `${folder}/`;
								return object.Key === prefix || object.Key!.startsWith(prefix);
							});
							if (!matchesFolder) return false;
						}

						return true;
					});

					objectsToExport.push(...objects.map((obj) => ({ Key: obj.Key!, Size: obj.Size || 0 })));
					continuationToken = listResponse.NextContinuationToken;
				} while (continuationToken);

				const bucketSizeGB = (
					objectsToExport.reduce((sum, o) => sum + o.Size, 0) /
					1024 /
					1024 /
					1024
				).toFixed(2);
				Logger.info(
					`Found ${objectsToExport.length} objects (${bucketSizeGB} GB) to export from bucket: ${bucketName}`
				);

				// Download objects in parallel with concurrency limit
				let downloadedCount = 0;
				let failedCount = 0;
				for (let i = 0; i < objectsToExport.length; i += CONCURRENCY_LIMIT) {
					if (isCancelled && isCancelled()) {
						throw new Error('Export cancelled by user');
					}

					const batch = objectsToExport.slice(i, i + CONCURRENCY_LIMIT);

					const downloadPromises = batch.map(async (object) => {
						try {
							const getObjectResponse = await s3Client.getObject({
								Bucket: bucketName,
								Key: object.Key
							});

							const objectPath = path.join(bucketDir, object.Key);
							const objectDir = path.dirname(objectPath);
							fs.mkdirSync(objectDir, { recursive: true });

							if (getObjectResponse.Body) {
								const bodyStream = getObjectResponse.Body;
								let fileContent: Buffer | Uint8Array;

								if (Buffer.isBuffer(bodyStream)) {
									fileContent = bodyStream;
								} else if (bodyStream instanceof Uint8Array) {
									fileContent = Buffer.from(bodyStream);
								} else {
									const chunks: Buffer[] = [];
									const streamBody = bodyStream as AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>;

									try {
										for await (const chunk of streamBody as AsyncIterable<Uint8Array>) {
											chunks.push(Buffer.from(chunk));
										}
									} catch {
										const reader = (streamBody as ReadableStream<Uint8Array>).getReader();
										try {
											while (true) {
												const { done, value } = await reader.read();
												if (done) break;
												if (value) chunks.push(Buffer.from(value));
											}
										} finally {
											reader.releaseLock();
										}
									}

									fileContent = Buffer.concat(chunks as Uint8Array[]) as Buffer;
								}

								fs.writeFileSync(objectPath, fileContent as Uint8Array);
								return { success: true, size: object.Size };
							}
							return { success: false, size: 0 };
						} catch (error) {
							Logger.warn(`Failed to export object: ${bucketName}/${object.Key}`, { error });
							return { success: false, size: 0 };
						}
					});

					const results = await Promise.all(downloadPromises);
					const successCount = results.filter((r) => r.success).length;
					const batchFailedCount = results.filter((r) => !r.success).length;
					const batchSize = results.reduce((sum, r) => sum + r.size, 0);

					downloadedCount += successCount;
					failedCount += batchFailedCount;
					totalObjects += successCount;
					totalSize += batchSize;

					// Log progress every 100 objects or at the end
					if (
						(downloadedCount % 100 === 0 && downloadedCount > 0) ||
						i + CONCURRENCY_LIMIT >= objectsToExport.length
					) {
						Logger.info(
							`[${bucketName}] Progress: ${downloadedCount}/${objectsToExport.length} exported, ${failedCount} failed`
						);
						if (onProgress) {
							const bucketProgress = Math.floor((bucketIndex / bucketsToExport.length) * 100);
							const objectProgress = Math.floor((downloadedCount / objectsToExport.length) * 100);
							onProgress('exporting_minio', bucketProgress, {
								bucket: bucketName,
								objects: `${downloadedCount}/${objectsToExport.length}`,
								progress: `${objectProgress}%`
							});
						}
					}
				}

				Logger.info(
					`Completed export of bucket ${bucketName}: ${downloadedCount} objects, ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`
				);
			} catch (error) {
				if (error instanceof Error && error.message === 'Export cancelled by user') {
					throw error;
				}
				Logger.error(`Failed to export bucket: ${bucketName}`, { error });
			}
		}

		// Create export manifest
		const manifest = {
			exportDate: new Date().toISOString(),
			exportPath,
			bucketsExported: bucketsToExport,
			totalObjects,
			totalSize,
			totalSizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2)
		};

		fs.writeFileSync(path.join(exportPath, 'export_manifest.json'), JSON.stringify(manifest, null, 2));
		Logger.info(`Export manifest saved to: ${path.join(exportPath, 'export_manifest.json')}`);

		Logger.info('=== MinIO Export Complete ===');
		Logger.info(`Export path: ${exportPath}`);
		Logger.info(`Total buckets: ${bucketsToExport.length}`);
		Logger.info(`Total objects: ${totalObjects}`);
		Logger.info(`Total size: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);

		if (onProgress) {
			onProgress('completed', 100, { message: 'Export completed successfully' });
		}

		return {
			success: true,
			exportPath,
			totalSize,
			totalObjects,
			buckets: bucketsToExport.length
		};
	}

	/**
	 * Restore system backup
	 */
	public async restoreSystemBackup(options: SystemRestoreOptions): Promise<SystemRestoreResult> {
		const {
			backupPath,
			restoreMongoDB = true,
			restoreElasticsearch = true,
			restoreMinIO = true,
			skipExisting = false
		} = options;

		const result: SystemRestoreResult = {
			success: true,
			components: {}
		};

		if (!fs.existsSync(backupPath)) {
			throw new Error('Backup file/folder not found');
		}

		const stats = fs.statSync(backupPath);

		// Check if it's a MinIO export folder (directory with export_manifest.json)
		if (stats.isDirectory()) {
			Logger.info(`Backup path is a directory: ${backupPath}`);
			const manifestPath = path.join(backupPath, 'export_manifest.json');
			Logger.info(`Checking for export manifest at: ${manifestPath}`);

			if (fs.existsSync(manifestPath)) {
				// This is a MinIO export folder - restore MinIO only
				Logger.info('Found export_manifest.json - treating as MinIO export folder');
				Logger.info(`Starting MinIO export restore from: ${backupPath}`);
				try {
					const restored = await this.restoreMinIOExport(backupPath, skipExisting);
					result.components.minio = { success: true, restored };
					Logger.info(`MinIO export restore completed successfully: ${restored} objects restored`);
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : 'Unknown error';
					Logger.error(`MinIO export restore failed: ${errorMsg}`, { error });
					result.components.minio = {
						success: false,
						error: errorMsg
					};
					result.success = false;
				}
				return result;
			} else {
				Logger.warn(`No export_manifest.json found in directory: ${backupPath}`);
				throw new Error('Directory is not a valid backup (no metadata.json or export_manifest.json found)');
			}
		}

		// Extract backup from zip file
		const extractDir = path.join(this.backupDir, `restore_${Date.now()}`);
		fs.mkdirSync(extractDir, { recursive: true });

		try {
			// Extract zip
			const zip = new AdmZip(backupPath);
			zip.extractAllTo(extractDir, true);

			// Read metadata
			const metadataPath = path.join(extractDir, 'metadata.json');
			if (!fs.existsSync(metadataPath)) {
				throw new Error('Metadata file not found in backup');
			}

			const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

			// Restore MongoDB
			if (restoreMongoDB && metadata.components.mongodb?.success) {
				try {
					await this.restoreMongoDB(extractDir, skipExisting);
					result.components.mongodb = { success: true };
				} catch (error) {
					result.components.mongodb = {
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					};
					result.success = false;
				}
			}

			// Restore Elasticsearch
			if (restoreElasticsearch && metadata.components.elasticsearch?.success) {
				try {
					const restored = await this.restoreElasticsearch(extractDir, skipExisting);
					result.components.elasticsearch = { success: true, restored };
				} catch (error) {
					result.components.elasticsearch = {
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					};
					result.success = false;
				}
			}

			// Restore MinIO
			if (restoreMinIO && metadata.components.minio?.success) {
				try {
					const restored = await this.restoreMinIO(extractDir, skipExisting);
					result.components.minio = { success: true, restored };
				} catch (error) {
					result.components.minio = {
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error'
					};
					result.success = false;
				}
			}

			// Cleanup
			fs.rmSync(extractDir, { recursive: true, force: true });

			return result;
		} catch (error) {
			// Cleanup on error
			if (fs.existsSync(extractDir)) {
				fs.rmSync(extractDir, { recursive: true, force: true });
			}
			throw error;
		}
	}

	/**
	 * Restore MongoDB from backup
	 */
	private async restoreMongoDB(extractDir: string, skipExisting: boolean): Promise<void> {
		const mongoDir = path.join(extractDir, 'mongodb');
		if (!fs.existsSync(mongoDir)) {
			throw new Error('MongoDB backup directory not found');
		}

		const manifestFile = path.join(mongoDir, 'manifest.json');
		const collectionsFile = path.join(mongoDir, 'collections.json');

		if (fs.existsSync(manifestFile)) {
			// New format: individual JSON files per collection
			await this.restoreMongoDBFromManifest(mongoDir, skipExisting);
		} else if (fs.existsSync(collectionsFile)) {
			// Legacy format: single collections.json file
			await this.restoreMongoDBFromJSON(collectionsFile, skipExisting);
		} else {
			// mongodump format
			const mongoUri = process.env.MONGODB_URL;
			if (!mongoUri) {
				throw new Error('MONGODB_URL not configured');
			}

			try {
				const { stdout } = await execAsync('which mongorestore');
				if (stdout.trim()) {
					await execAsync(
						`mongorestore --uri="${mongoUri}" --dir="${mongoDir}" ${skipExisting ? '--drop' : ''}`,
						{ maxBuffer: 1024 * 1024 * 100 }
					);
				} else {
					throw new Error('mongorestore not available');
				}
			} catch (error) {
				throw new Error(`MongoDB restore failed: ${(error as Error).message}`);
			}
		}
	}

	/**
	 * Restore MongoDB from manifest format (individual JSON files per collection)
	 */
	private async restoreMongoDBFromManifest(mongoDir: string, skipExisting: boolean): Promise<void> {
		const db = mongoose.connection.db;
		if (!db || mongoose.connection.readyState !== 1) {
			throw new Error('MongoDB connection not established');
		}

		const manifest = JSON.parse(fs.readFileSync(path.join(mongoDir, 'manifest.json'), 'utf8'));
		const collections: string[] = manifest.collections || [];

		for (const collectionName of collections) {
			const collectionFile = path.join(mongoDir, `${collectionName}.json`);
			if (!fs.existsSync(collectionFile)) {
				Logger.warn(`Collection file not found: ${collectionFile}`);
				continue;
			}

			try {
				const documents = JSON.parse(fs.readFileSync(collectionFile, 'utf8'));
				if (!Array.isArray(documents)) continue;

				const collection = db.collection(collectionName);

				if (skipExisting) {
					await collection.deleteMany({});
				}

				if (documents.length > 0) {
					await collection.insertMany(documents);
				}
				Logger.info(`Restored ${documents.length} documents to collection: ${collectionName}`);
			} catch (error) {
				Logger.warn(`Failed to restore collection: ${collectionName}`, { error });
			}
		}
	}

	/**
	 * Restore MongoDB from legacy JSON backup (single collections.json file)
	 */
	private async restoreMongoDBFromJSON(collectionsFile: string, skipExisting: boolean): Promise<void> {
		const db = mongoose.connection.db;
		if (!db || mongoose.connection.readyState !== 1) {
			throw new Error('MongoDB connection not established');
		}

		const backupData = JSON.parse(fs.readFileSync(collectionsFile, 'utf8'));

		for (const [collectionName, documents] of Object.entries(backupData)) {
			if (!Array.isArray(documents)) continue;

			try {
				const collection = db.collection(collectionName);
				if (skipExisting) await collection.deleteMany({});
				if (documents.length > 0) await collection.insertMany(documents);
			} catch (error) {
				Logger.warn(`Failed to restore collection: ${collectionName}`, { error });
			}
		}
	}

	/**
	 * Restore Elasticsearch from backup
	 */
	private async restoreElasticsearch(extractDir: string, skipExisting: boolean): Promise<number> {
		const esDir = path.join(extractDir, 'elasticsearch');
		if (!fs.existsSync(esDir)) {
			throw new Error('Elasticsearch backup directory not found');
		}

		if (!process.esclient) {
			throw new Error('Elasticsearch client not initialized');
		}

		// Get all index files from the elasticsearch directory
		const indexFiles = fs.readdirSync(esDir).filter((f) => f.endsWith('.json'));
		if (indexFiles.length === 0) {
			throw new Error('No Elasticsearch index backup files found');
		}

		let totalRestored = 0;

		for (const indexFile of indexFiles) {
			const indexName = indexFile.replace('.json', '');
			const indexPath = path.join(esDir, indexFile);

			try {
				const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as {
					mapping: Record<string, unknown>;
					documents: Array<{ _id: string; _source: Record<string, unknown> }>;
				};

				// Delete index if skipExisting is false
				if (!skipExisting) {
					try {
						await process.esclient.indices.delete({ index: indexName });
					} catch {
						/* ignore - index might not exist */
					}
				}

				// Create index with mapping
				if (indexData.mapping) {
					try {
						await process.esclient.indices.create({
							index: indexName,
							body: { mappings: indexData.mapping }
						});
					} catch (error) {
						if (!skipExisting) throw error;
					}
				}

				// Bulk index documents
				const documents = indexData.documents || [];
				const BATCH_SIZE = 500;

				for (let i = 0; i < documents.length; i += BATCH_SIZE) {
					const batch = documents.slice(i, i + BATCH_SIZE);
					const bulkBody = batch.flatMap((doc) => [
						{ index: { _index: indexName, _id: doc._id } },
						doc._source
					]);

					if (bulkBody.length > 0) {
						const response = await process.esclient.bulk({ body: bulkBody, refresh: false });
						if (!response.errors) {
							totalRestored += batch.length;
						} else {
							// Count successful operations
							const successful = response.items.filter(
								(item: { index?: { error?: unknown } }) => !item.index?.error
							).length;
							totalRestored += successful;
						}
					}
				}

				Logger.info(`Restored ${documents.length} documents to index: ${indexName}`);
			} catch (error) {
				Logger.warn(`Failed to restore index: ${indexName}`, { error });
			}
		}

		return totalRestored;
	}

	/**
	 * Restore MinIO from backup
	 */
	private async restoreMinIO(extractDir: string, skipExisting: boolean): Promise<number> {
		const minioDir = path.join(extractDir, 'minio');
		if (!fs.existsSync(minioDir)) {
			throw new Error('MinIO backup directory not found');
		}

		const s3Client = S3Client.instance();
		const buckets = fs
			.readdirSync(minioDir, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);

		let totalRestored = 0;

		for (const bucketName of buckets) {
			try {
				// Create bucket if it doesn't exist
				try {
					await s3Client.headBucket({ Bucket: bucketName });
				} catch {
					await s3Client.createBucket({ Bucket: bucketName });
				}

				const bucketDir = path.join(minioDir, bucketName);
				const objects = this.getAllFiles(bucketDir);

				for (const filePath of objects) {
					const relativePath = path.relative(bucketDir, filePath);
					const key = relativePath.replace(/\\/g, '/');

					// Skip if exists and skipExisting is true
					if (skipExisting) {
						try {
							await s3Client.headObject({ Bucket: bucketName, Key: key });
							continue;
						} catch {
							// Object doesn't exist, proceed
						}
					}

					const fileContent = fs.readFileSync(filePath);
					await s3Client.putObject({
						Bucket: bucketName,
						Key: key,
						Body: fileContent
					});
					totalRestored++;
				}
			} catch (error) {
				Logger.warn(`Failed to restore bucket: ${bucketName}`, { error });
			}
		}

		return totalRestored;
	}

	/**
	 * Restore MinIO from export folder (minio_export_xxx directories)
	 */
	private async restoreMinIOExport(exportDir: string, skipExisting: boolean): Promise<number> {
		Logger.info('=== Starting MinIO Export Restore ===');
		Logger.info(`Export directory: ${exportDir}`);
		Logger.info(`Skip existing: ${skipExisting}`);

		const s3Client = S3Client.instance();

		// Read manifest to get bucket info
		const manifestPath = path.join(exportDir, 'export_manifest.json');
		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
		Logger.info('Export manifest loaded:', {
			exportDate: manifest.exportDate,
			bucketsExported: manifest.bucketsExported,
			totalObjects: manifest.totalObjects,
			totalSizeGB: manifest.totalSizeGB
		});

		// Get all bucket directories (exclude manifest file)
		const buckets = fs
			.readdirSync(exportDir, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);

		Logger.info(`Found ${buckets.length} bucket directories: ${buckets.join(', ')}`);

		let totalRestored = 0;
		let totalSkipped = 0;

		for (let i = 0; i < buckets.length; i++) {
			const bucketName = buckets[i];
			Logger.info(`[${i + 1}/${buckets.length}] Processing bucket: ${bucketName}`);

			try {
				// Create bucket if it doesn't exist
				try {
					await s3Client.headBucket({ Bucket: bucketName });
					Logger.info(`Bucket exists: ${bucketName}`);
				} catch {
					await s3Client.createBucket({ Bucket: bucketName });
					Logger.info(`Created new bucket: ${bucketName}`);
				}

				const bucketDir = path.join(exportDir, bucketName);
				const objects = this.getAllFiles(bucketDir);
				Logger.info(`Found ${objects.length} files to restore in bucket: ${bucketName}`);

				let bucketRestored = 0;
				let bucketSkipped = 0;

				for (let j = 0; j < objects.length; j++) {
					const filePath = objects[j];
					const relativePath = path.relative(bucketDir, filePath);
					const key = relativePath.replace(/\\/g, '/');

					// Log progress every 100 objects
					if ((j + 1) % 100 === 0 || j === objects.length - 1) {
						Logger.info(`[${bucketName}] Progress: ${j + 1}/${objects.length} objects processed`);
					}

					// Skip if exists and skipExisting is true
					if (skipExisting) {
						try {
							await s3Client.headObject({ Bucket: bucketName, Key: key });
							bucketSkipped++;
							totalSkipped++;
							continue;
						} catch {
							// Object doesn't exist, proceed
						}
					}

					const fileContent = fs.readFileSync(filePath);
					await s3Client.putObject({
						Bucket: bucketName,
						Key: key,
						Body: fileContent
					});
					bucketRestored++;
					totalRestored++;
				}

				Logger.info(`Completed bucket ${bucketName}: ${bucketRestored} restored, ${bucketSkipped} skipped`);
			} catch (error) {
				Logger.error(`Failed to restore bucket: ${bucketName}`, { error });
			}
		}

		Logger.info('=== MinIO Export Restore Complete ===');
		Logger.info(`Total restored: ${totalRestored} objects`);
		Logger.info(`Total skipped: ${totalSkipped} objects`);

		return totalRestored;
	}

	/**
	 * Helper: Get all files recursively
	 */
	private getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
		const files = fs.readdirSync(dirPath);

		files.forEach((file) => {
			const filePath = path.join(dirPath, file);
			if (fs.statSync(filePath).isDirectory()) {
				arrayOfFiles = this.getAllFiles(filePath, arrayOfFiles);
			} else {
				arrayOfFiles.push(filePath);
			}
		});

		return arrayOfFiles;
	}

	/**
	 * Helper: Get directory size
	 */
	private getDirectorySize(dirPath: string): number {
		let size = 0;
		try {
			const files = fs.readdirSync(dirPath);
			for (const file of files) {
				const filePath = path.join(dirPath, file);
				const stats = fs.statSync(filePath);
				if (stats.isDirectory()) {
					size += this.getDirectorySize(filePath);
				} else {
					size += stats.size;
				}
			}
		} catch {
			// Directory might not exist
		}
		return size;
	}

	/**
	 * Helper: Create zip archive
	 */
	private async createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const output = fs.createWriteStream(outputPath);
			const archive = archiver('zip', { zlib: { level: 9 } });

			output.on('close', () => resolve());
			archive.on('error', (err) => reject(err));

			archive.pipe(output);
			archive.directory(sourceDir, false);
			archive.finalize();
		});
	}

	/**
	 * List folders/prefixes in a MinIO bucket
	 */
	public async listMinIOFolders(bucketName: string, prefix?: string): Promise<string[]> {
		try {
			const s3Client = S3Client.instance();
			const folders = new Set<string>();

			const listParams: {
				Bucket: string;
				Delimiter: string;
				Prefix?: string;
				ContinuationToken?: string;
			} = {
				Bucket: bucketName,
				Delimiter: '/' // Use delimiter to get folder-like structure
			};

			if (prefix) {
				listParams.Prefix = prefix;
			}

			let continuationToken: string | undefined;

			do {
				if (continuationToken) {
					listParams.ContinuationToken = continuationToken;
				}

				const listResponse = await s3Client.listObjectsV2(listParams);

				// Get common prefixes (folders)
				if (listResponse.CommonPrefixes) {
					for (const prefixInfo of listResponse.CommonPrefixes) {
						if (prefixInfo.Prefix) {
							folders.add(prefixInfo.Prefix);
						}
					}
				}

				continuationToken = listResponse.NextContinuationToken;
			} while (continuationToken);

			return Array.from(folders).sort();
		} catch (error) {
			Logger.error(`Failed to list folders in bucket: ${bucketName}`, { error });
			throw new Error(`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * List available system backup files
	 */
	public async listSystemBackups(): Promise<
		Array<{
			fileName: string;
			filePath: string;
			size: number;
			createdDate: Date;
			metadata?: Record<string, unknown>;
		}>
	> {
		const files = fs.readdirSync(this.backupDir);
		const backups = [];

		for (const file of files) {
			if (!file.endsWith('.zip') || !file.startsWith('system_backup_')) continue;

			const filePath = path.join(this.backupDir, file);
			const stats = fs.statSync(filePath);

			// Try to extract metadata from backup
			let metadata: Record<string, unknown> | undefined;
			try {
				const zip = new AdmZip(filePath);
				const metadataEntry = zip.getEntry('metadata.json');
				if (metadataEntry) {
					const metadataContent = metadataEntry.getData().toString('utf8');
					metadata = JSON.parse(metadataContent) as Record<string, unknown>;
				}
			} catch {
				// Ignore metadata extraction errors
			}

			backups.push({
				fileName: file,
				filePath,
				size: stats.size,
				createdDate: stats.birthtime,
				metadata
			});
		}

		return backups.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());
	}
}
