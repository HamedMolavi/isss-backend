import { EventEmitter } from 'events';
import { SystemBackupService, SystemBackupOptions, SystemBackupResult } from './systemBackup.service';
import { Logger } from '../logger';
import BackupJob, {
	BackupJobStatus as DBBackupJobStatus,
	BackupStage as DBBackupStage,
	BackupStorageType,
	JobType,
	IBackupJob
} from '../db/mongo/models/backupJob';

export enum BackupJobStatus {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	FAILED = 'failed',
	CANCELLED = 'cancelled'
}

export enum BackupStage {
	PREPARING = 'preparing',
	ESTIMATING = 'estimating',
	STORAGE_CHECK = 'storage_check',
	BACKING_UP_MONGODB = 'backing_up_mongodb',
	BACKING_UP_ELASTICSEARCH = 'backing_up_elasticsearch',
	BACKING_UP_MINIO = 'backing_up_minio',
	CREATING_ARCHIVE = 'creating_archive',
	FINALIZING = 'finalizing'
}

export interface BackupJobProgress {
	jobId: string;
	status: BackupJobStatus;
	currentStage: BackupStage;
	progressPercentage: number;
	startTime: Date;
	estimatedCompletionTime?: Date;
	actualCompletionTime?: Date;
	error?: string;
	result?: SystemBackupResult;
	options?: SystemBackupOptions;
	stageDetails?: Record<string, string>;
}

const STAGE_MAP: Record<string, BackupStage> = {
	backing_up_mongodb: BackupStage.BACKING_UP_MONGODB,
	backing_up_elasticsearch: BackupStage.BACKING_UP_ELASTICSEARCH,
	backing_up_minio: BackupStage.BACKING_UP_MINIO,
	creating_archive: BackupStage.CREATING_ARCHIVE,
	finalizing: BackupStage.FINALIZING,
	completed: BackupStage.FINALIZING
};

export class BackupJobManager extends EventEmitter {
	private static instance: BackupJobManager;
	private jobs: Map<string, BackupJobProgress> = new Map();
	private activeJobs: Set<string> = new Set();
	private cancelledJobs: Set<string> = new Set();

	private constructor() {
		super();
		// Load active jobs from database on startup
		this.loadActiveJobsFromDB().catch((error) => {
			Logger.error('Failed to load active jobs from database', { error });
		});
	}

	private async loadActiveJobsFromDB(): Promise<void> {
		try {
			const activeJobs = await BackupJob.find({
				status: { $in: [DBBackupJobStatus.PENDING, DBBackupJobStatus.IN_PROGRESS] }
			}).exec();

			for (const job of activeJobs) {
				this.jobs.set(job.jobId, this.toProgress(job));
				const hoursRunning = (Date.now() - job.startTime.getTime()) / 3600000;
				if (hoursRunning > 24) {
					await this.updateDB(job.jobId, {
						status: DBBackupJobStatus.FAILED,
						error: 'Job timed out (server restart)',
						actualCompletionTime: new Date()
					});
				}
			}
			Logger.info(`Loaded ${activeJobs.length} active backup jobs`);
		} catch (error) {
			Logger.error('Failed to load active jobs', { error });
		}
	}

	private toProgress(doc: IBackupJob): BackupJobProgress {
		return {
			jobId: doc.jobId,
			status: doc.status as BackupJobStatus,
			currentStage: doc.currentStage as BackupStage,
			progressPercentage: doc.progressPercentage,
			startTime: doc.startTime,
			estimatedCompletionTime: doc.estimatedCompletionTime,
			actualCompletionTime: doc.actualCompletionTime,
			error: doc.error,
			result: doc.result as SystemBackupResult | undefined,
			stageDetails: doc.stageDetails as Record<string, string>
		};
	}

	private async saveDB(job: BackupJobProgress): Promise<void> {
		try {
			await BackupJob.findOneAndUpdate(
				{ jobId: job.jobId },
				{ ...job, status: job.status as DBBackupJobStatus, currentStage: job.currentStage as DBBackupStage },
				{ upsert: true }
			).exec();
		} catch (error) {
			Logger.error(`Failed to save job ${job.jobId}`, { error });
		}
	}

	private async updateDB(jobId: string, updates: Partial<IBackupJob>): Promise<void> {
		try {
			await BackupJob.findOneAndUpdate({ jobId }, { $set: updates }).exec();
		} catch (error) {
			Logger.error(`Failed to update job ${jobId}`, { error });
		}
	}

	public static getInstance(): BackupJobManager {
		if (!BackupJobManager.instance) {
			BackupJobManager.instance = new BackupJobManager();
		}
		return BackupJobManager.instance;
	}

	public async startBackupJob(
		jobId: string,
		options: SystemBackupOptions,
		startTime: Date
	): Promise<BackupJobProgress> {
		if (this.activeJobs.has(jobId)) {
			throw new Error(`Backup job ${jobId} is already running`);
		}

		const job: BackupJobProgress = {
			jobId,
			status: BackupJobStatus.PENDING,
			currentStage: BackupStage.PREPARING,
			progressPercentage: 0,
			startTime,
			options,
			stageDetails: {}
		};

		this.jobs.set(jobId, job);
		this.activeJobs.add(jobId);
		await this.saveDB(job);

		this.executeBackupJob(jobId, options, startTime).catch((error) => {
			Logger.error(`Background backup ${jobId} failed`, { error });
		});

		return job;
	}

	private async executeBackupJob(
		jobId: string,
		options: SystemBackupOptions,
		startTime: Date
	): Promise<void> {
		if (!this.jobs.has(jobId)) return;

		const backupService = SystemBackupService.getInstance();
		const toGB = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2);

		try {
			await this.updateJobProgress(jobId, {
				status: BackupJobStatus.IN_PROGRESS,
				currentStage: BackupStage.ESTIMATING,
				progressPercentage: 5,
				stageDetails: { estimating: 'Calculating backup size...' }
			});

			const estimate = await backupService.estimateBackupTime(options, startTime);
			if (!estimate.storageCheck.hasEnoughSpace) {
				throw new Error(
					`Insufficient storage. Required: ${toGB(estimate.storageCheck.requiredSpace)} GB, Available: ${toGB(estimate.storageCheck.availableSpace)} GB`
				);
			}

			await this.updateJobProgress(jobId, {
				currentStage: BackupStage.STORAGE_CHECK,
				progressPercentage: 10,
				estimatedCompletionTime: estimate.estimatedCompletionTime,
				stageDetails: {
					estimating: `Size: ${toGB(estimate.estimatedSize)} GB, Duration: ${Math.ceil(estimate.estimatedDurationSeconds / 60)} min`
				}
			});

			const result = await backupService.createSystemBackup(
				options,
				startTime,
				(stage, percentage, details) => {
					const currentStage = STAGE_MAP[stage] || BackupStage.BACKING_UP_MONGODB;
					const stageDetails = { ...this.jobs.get(jobId)?.stageDetails, ...details };
					this.updateJobProgress(jobId, { currentStage, progressPercentage: percentage, stageDetails }).catch(
						() => {}
					);
				},
				// Pass cancellation check function
				() => this.isJobCancelled(jobId)
			);

			// Determine storage type and set expiration (15 days for MinIO backups)
			const storageType = options.externalDrivePath
				? BackupStorageType.EXTERNAL_DRIVE
				: BackupStorageType.MINIO;
			const expiresAt =
				storageType === BackupStorageType.MINIO
					? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days
					: undefined;

			await this.updateJobProgress(jobId, {
				status: BackupJobStatus.COMPLETED,
				currentStage: BackupStage.FINALIZING,
				progressPercentage: 100,
				actualCompletionTime: new Date(),
				result
			});

			// Update DB with storage type and expiration
			await BackupJob.findOneAndUpdate({ jobId }, { storageType, expiresAt });

			this.emit('job-completed', jobId, result);
		} catch (error) {
			await this.updateJobProgress(jobId, {
				status: BackupJobStatus.FAILED,
				error: error instanceof Error ? error.message : 'Unknown error',
				actualCompletionTime: new Date()
			});
			this.emit('job-failed', jobId, error instanceof Error ? error.message : 'Unknown error');
		} finally {
			this.activeJobs.delete(jobId);
		}
	}

	private async updateJobProgress(jobId: string, updates: Partial<BackupJobProgress>): Promise<void> {
		const job = this.jobs.get(jobId);
		if (!job) return;

		Object.assign(job, updates);
		this.jobs.set(jobId, job);
		this.saveDB(job).catch(() => {});
		this.emit('job-progress', jobId, job);
	}

	// ==================== Export Job Methods ====================

	public async startExportJob(
		jobId: string,
		externalDrivePath: string,
		buckets?: string[],
		folders?: Record<string, string[]>
	): Promise<BackupJobProgress> {
		if (this.activeJobs.has(jobId)) {
			throw new Error(`Export job ${jobId} is already running`);
		}

		const job: BackupJobProgress = {
			jobId,
			status: BackupJobStatus.PENDING,
			currentStage: BackupStage.BACKING_UP_MINIO,
			progressPercentage: 0,
			startTime: new Date(),
			options: { externalDrivePath, minIOBuckets: buckets, minIOFolders: folders },
			stageDetails: {}
		};

		this.jobs.set(jobId, job);
		this.activeJobs.add(jobId);

		// Save with jobType = MINIO_EXPORT
		await BackupJob.findOneAndUpdate(
			{ jobId },
			{
				...job,
				jobType: JobType.MINIO_EXPORT,
				status: job.status as DBBackupJobStatus,
				currentStage: job.currentStage as DBBackupStage,
				storageType: BackupStorageType.EXTERNAL_DRIVE
			},
			{ upsert: true }
		).exec();

		this.executeExportJob(jobId, externalDrivePath, buckets, folders).catch((error) => {
			Logger.error(`Background export ${jobId} failed`, { error });
		});

		return job;
	}

	private async executeExportJob(
		jobId: string,
		externalDrivePath: string,
		buckets?: string[],
		folders?: Record<string, string[]>
	): Promise<void> {
		if (!this.jobs.has(jobId)) return;

		const backupService = SystemBackupService.getInstance();

		try {
			await this.updateJobProgress(jobId, {
				status: BackupJobStatus.IN_PROGRESS,
				currentStage: BackupStage.BACKING_UP_MINIO,
				progressPercentage: 5,
				stageDetails: { minio: 'Starting MinIO export...' }
			});

			const result = await backupService.exportMinIOToExternalDrive(
				externalDrivePath,
				buckets,
				folders,
				(stage, percentage, details) => {
					const stageDetails = { ...this.jobs.get(jobId)?.stageDetails, ...details };
					this.updateJobProgress(jobId, {
						progressPercentage: percentage,
						stageDetails
					}).catch(() => {});
				},
				() => this.isJobCancelled(jobId)
			);

			await this.updateJobProgress(jobId, {
				status: BackupJobStatus.COMPLETED,
				currentStage: BackupStage.FINALIZING,
				progressPercentage: 100,
				actualCompletionTime: new Date()
			});

			// Save export result to DB
			await BackupJob.findOneAndUpdate(
				{ jobId },
				{
					exportResult: {
						exportPath: result.exportPath,
						totalSize: result.totalSize,
						totalObjects: result.totalObjects,
						bucketsExported: buckets || []
					}
				}
			);

			this.emit('job-completed', jobId, result);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			await this.updateJobProgress(jobId, {
				status: errorMsg.includes('cancelled') ? BackupJobStatus.CANCELLED : BackupJobStatus.FAILED,
				error: errorMsg,
				actualCompletionTime: new Date()
			});
			this.emit('job-failed', jobId, errorMsg);
		} finally {
			this.activeJobs.delete(jobId);
		}
	}

	public async getJobStatus(jobId: string): Promise<BackupJobProgress | null> {
		if (this.jobs.has(jobId)) return this.jobs.get(jobId)!;

		try {
			const dbJob = await BackupJob.findOne({ jobId }).exec();
			if (dbJob) {
				const job = this.toProgress(dbJob);
				this.jobs.set(jobId, job);
				return job;
			}
		} catch (error) {
			Logger.error(`Failed to load job ${jobId}`, { error });
		}
		return null;
	}

	public async getAllJobs(limit = 100): Promise<BackupJobProgress[]> {
		try {
			const dbJobs = await BackupJob.find().sort({ startTime: -1 }).limit(limit).exec();
			return dbJobs.map((doc) => {
				const job = this.toProgress(doc);
				this.jobs.set(doc.jobId, job);
				return job;
			});
		} catch (error) {
			Logger.error('Failed to load jobs', { error });
			return Array.from(this.jobs.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
		}
	}

	public isJobCancelled(jobId: string): boolean {
		return this.cancelledJobs.has(jobId);
	}

	public async cancelJob(jobId: string): Promise<boolean> {
		let job = this.jobs.get(jobId);
		if (!job) {
			const dbJob = await BackupJob.findOne({ jobId }).exec();
			if (!dbJob) return false;
			job = this.toProgress(dbJob);
			this.jobs.set(jobId, job);
		}

		if (job.status === BackupJobStatus.COMPLETED || job.status === BackupJobStatus.FAILED) return false;

		this.cancelledJobs.add(jobId);
		await this.updateJobProgress(jobId, {
			status: BackupJobStatus.CANCELLED,
			actualCompletionTime: new Date(),
			error: 'Backup cancelled by user'
		});

		this.activeJobs.delete(jobId);
		this.emit('job-cancelled', jobId);
		setTimeout(() => this.cancelledJobs.delete(jobId), 60000);
		return true;
	}

	public async listJobs(options?: {
		status?: BackupJobStatus;
		limit?: number;
		skip?: number;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
	}): Promise<IBackupJob[]> {
		const { status, limit = 100, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options || {};
		const query = status ? { status } : {};
		const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
		return (await BackupJob.find(query).sort(sort).skip(skip).limit(limit).lean().exec()) as IBackupJob[];
	}

	public async countJobs(options?: { status?: BackupJobStatus }): Promise<number> {
		const query = options?.status ? { status: options.status } : {};
		return await BackupJob.countDocuments(query).exec();
	}

	public cleanupOldJobs(keepLast = 50): number {
		const completed = Array.from(this.jobs.values())
			.filter((j) => j.status === BackupJobStatus.COMPLETED || j.status === BackupJobStatus.FAILED)
			.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

		let removed = 0;
		for (const job of completed.slice(keepLast)) {
			if (!this.activeJobs.has(job.jobId)) {
				this.jobs.delete(job.jobId);
				removed++;
			}
		}
		return removed;
	}
}
