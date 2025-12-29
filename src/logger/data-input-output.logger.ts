import { Request } from 'express';
import { Logger } from '.';
import { LogType } from '../db/mongo/models/logType';
import { LOG_TYPE_KEYS } from '../types/enums/logType.enum';
import { getClientIP } from '../tools/util.tools';

/**
 * Data export event types
 */
export enum DataExportEventType {
	EXCEL_EXPORT = 'excel_export',
	CSV_EXPORT = 'csv_export',
	REPORT_EXPORT = 'report_export',
	VIDEO_DOWNLOAD = 'video_download',
	BACKUP_EXPORT = 'backup_export',
	SNAPSHOT_CAPTURE = 'snapshot_capture'
}

/**
 * Data import event types
 */
export enum DataImportEventType {
	BATCH_IMPORT = 'batch_import',
	BULK_PERSONNEL_IMPORT = 'bulk_personnel_import',
	PLATE_BATCH_IMPORT = 'plate_batch_import',
	FILE_UPLOAD = 'file_upload'
}

/**
 * Data import/export logger following the same pattern as UserLogger and AuthLogger
 */
export class DataImportExportLogger {
	private static createBaseLogData(
		req: Request,
		action: string,
		success: boolean,
		type: string = 'data_operation'
	) {
		return {
			type,
			action,
			success,
			userid: req.user?._id?.toString(),
			username: req.user?.username,
			ip: getClientIP(req) || 'unknown',
			userAgent: req.get('User-Agent') || 'unknown',
			method: req.method,
			url: req.originalUrl,
			timestamp: new Date()
		};
	}

	/**
	 * Log Excel export from reports
	 */
	static async excelExported(
		req: Request,
		reportType: string,
		recordCount: number,
		success: boolean = true,
		error?: string
	): Promise<void> {
		try {
			// Always log export operations regardless of successEvents setting
			const logMethod = success ? Logger.info : Logger.error;
			logMethod(`Excel report exported: ${reportType}`, {
				...this.createBaseLogData(req, DataExportEventType.EXCEL_EXPORT, success, 'data_export'),
				details: {
					reportType,
					recordCount,
					format: 'EXCEL',
					error
				}
			});
		} catch (logError) {
			console.error('Error logging Excel export:', logError);
		}
	}

	/**
	 * Log backup export
	 */
	static async backupExported(
		req: Request,
		dataType: string,
		recordCount: number,
		success: boolean = true,
		error?: string
	): Promise<void> {
		try {
			// Always log export operations regardless of successEvents setting
			const logMethod = success ? Logger.info : Logger.error;
			logMethod(`Backup exported: ${dataType}`, {
				...this.createBaseLogData(req, DataExportEventType.BACKUP_EXPORT, success, 'data_export'),
				details: {
					dataType,
					recordCount,
					format: 'EXCEL',
					purpose: 'backup_and_delete',
					error
				}
			});
		} catch (logError) {
			console.error('Error logging backup export:', logError);
		}
	}

	/**
	 * Log video download
	 */
	static videoDownloaded(req: Request, videoId: string, success: boolean = true, error?: string): void {
		try {
			// Always log export operations regardless of successEvents setting
			const logMethod = success ? Logger.info : Logger.error;
			logMethod('Video downloaded', {
				...this.createBaseLogData(req, DataExportEventType.VIDEO_DOWNLOAD, success, 'file_download'),
				details: {
					videoId,
					format: 'MP4',
					purpose: 'video_access',
					error
				}
			});
		} catch (logError) {
			console.error('Error logging video download:', logError);
		}
	}

	/**
	 * Log batch personnel import
	 */
	static async batchPersonnelImported(
		req: Request,
		successCount: number,
		failedCount: number,
		success: boolean = true,
		error?: string
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (!success || logType?.[LOG_TYPE_KEYS.successEvents] === true) {
				const logMethod = success ? Logger.info : Logger.error;
				logMethod('Batch personnel imported', {
					...this.createBaseLogData(req, DataImportEventType.BULK_PERSONNEL_IMPORT, success, 'data_import'),
					details: {
						successCount,
						failedCount,
						totalProcessed: successCount + failedCount,
						dataType: 'personnel',
						source: 'face_recognition',
						error
					}
				});
			}
		} catch (logError) {
			console.error('Error logging batch personnel import:', logError);
		}
	}

	/**
	 * Log plate batch import
	 */
	static plateBatchImported(
		req: Request,
		importedCount: number,
		success: boolean = true,
		error?: string
	): void {
		try {
			const logMethod = success ? Logger.info : Logger.error;
			logMethod('Plate batch imported', {
				...this.createBaseLogData(req, DataImportEventType.PLATE_BATCH_IMPORT, success, 'data_import'),
				details: {
					recordCount: importedCount,
					dataType: 'car_plates',
					source: 'excel_file',
					error
				}
			});
		} catch (logError) {
			console.error('Error logging plate batch import:', logError);
		}
	}

	/**
	 * Log snapshot capture from camera
	 */
	static snapshotCaptured(
		req: Request,
		cameraId: string,
		cameraIp: string,
		success: boolean = true,
		error?: string
	): void {
		try {
			// Always log snapshot operations regardless of successEvents setting
			const logMethod = success ? Logger.info : Logger.error;
			logMethod('Camera snapshot captured', {
				...this.createBaseLogData(req, DataExportEventType.SNAPSHOT_CAPTURE, success, 'camera_operation'),
				details: {
					cameraId,
					cameraIp,
					format: 'BASE64_IMAGE',
					purpose: 'camera_snapshot',
					error
				}
			});
		} catch (logError) {
			console.error('Error logging snapshot capture:', logError);
		}
	}

	/**
	 * Log file upload
	 */
	static fileUploaded(
		req: Request,
		fileName: string,
		fileType: string,
		success: boolean = true,
		error?: string
	): void {
		try {
			const logMethod = success ? Logger.info : Logger.error;
			logMethod('File uploaded', {
				...this.createBaseLogData(req, DataImportEventType.FILE_UPLOAD, success, 'file_upload'),
				details: {
					fileName,
					fileType,
					purpose: 'data_processing',
					error
				}
			});
		} catch (logError) {
			console.error('Error logging file upload:', logError);
		}
	}
}
