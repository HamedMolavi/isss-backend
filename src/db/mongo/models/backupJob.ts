import mongoose, { Schema, Document } from 'mongoose';

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

export enum BackupStorageType {
	MINIO = 'minio',
	EXTERNAL_DRIVE = 'external_drive'
}

export enum JobType {
	SYSTEM_BACKUP = 'system_backup',
	MINIO_EXPORT = 'minio_export'
}

export interface IBackupJob extends Document {
	jobId: string;
	jobType: JobType;
	status: BackupJobStatus;
	currentStage: BackupStage;
	progressPercentage: number;
	startTime: Date;
	estimatedCompletionTime?: Date;
	actualCompletionTime?: Date;
	error?: string;
	storageType?: BackupStorageType;
	expiresAt?: Date;
	isDeleted?: boolean;
	deletedAt?: Date;
	result?: {
		backupPath: string;
		backupSize: number;
		downloadUrl?: string;
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
			backupType: string;
			externalDrivePath?: string;
		};
	};
	stageDetails?: {
		mongodb?: string;
		elasticsearch?: string;
		minio?: string;
		archive?: string;
		estimating?: string;
	};
	options?: {
		includeMongoDB?: boolean;
		includeElasticsearch?: boolean;
		includeMinIO?: boolean;
		includeFrame?: boolean;
		mongoDBCollections?: string[];
		elasticsearchIndices?: string[];
		minIOBuckets?: string[];
		minIOFolders?: Record<string, string[]>;
		externalDrivePath?: string;
	};
	// Export-specific result
	exportResult?: {
		exportPath: string;
		totalSize: number;
		totalObjects: number;
		bucketsExported: string[];
	};
	createdAt: Date;
	updatedAt: Date;
}

const BackupJobSchema: Schema<IBackupJob> = new Schema(
	{
		jobId: {
			type: String,
			required: true,
			unique: true,
			index: true
		},
		jobType: {
			type: String,
			enum: Object.values(JobType),
			default: JobType.SYSTEM_BACKUP,
			index: true
		},
		status: {
			type: String,
			enum: Object.values(BackupJobStatus),
			default: BackupJobStatus.PENDING,
			index: true
		},
		currentStage: {
			type: String,
			enum: Object.values(BackupStage),
			default: BackupStage.PREPARING
		},
		progressPercentage: {
			type: Number,
			default: 0,
			min: 0,
			max: 100
		},
		startTime: {
			type: Date,
			required: true,
			default: Date.now
		},
		estimatedCompletionTime: {
			type: Date
		},
		actualCompletionTime: {
			type: Date
		},
		error: {
			type: String
		},
		result: {
			type: Schema.Types.Mixed
		},
		stageDetails: {
			type: Schema.Types.Mixed,
			default: {}
		},
		options: {
			type: Schema.Types.Mixed
		},
		storageType: {
			type: String,
			enum: Object.values(BackupStorageType),
			default: BackupStorageType.MINIO
		},
		expiresAt: {
			type: Date,
			index: true
		},
		isDeleted: {
			type: Boolean,
			default: false
		},
		deletedAt: {
			type: Date
		},
		exportResult: {
			type: Schema.Types.Mixed
		}
	},
	{
		collection: 'BackupJob',
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
	}
);

// Add indexes for common queries
BackupJobSchema.index({ status: 1, createdAt: -1 });
BackupJobSchema.index({ startTime: -1 });
BackupJobSchema.index({ jobId: 1, status: 1 });

// TTL index to automatically delete old completed/failed jobs after 30 days
BackupJobSchema.index(
	{ createdAt: 1 },
	{
		expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
		partialFilterExpression: {
			status: { $in: [BackupJobStatus.COMPLETED, BackupJobStatus.FAILED, BackupJobStatus.CANCELLED] }
		}
	}
);

// Compile Model from schema
const BackupJob = mongoose.model<IBackupJob>('BackupJob', BackupJobSchema);

export default BackupJob;
