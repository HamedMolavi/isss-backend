import { Request } from 'express';
import { Logger } from '.';
import { LogType } from '../db/mongo/models/logType';
import { LOG_TYPE_KEYS } from '../types/enums/logType.enum';

/**
 * Log integrity event types
 */
export enum LogIntegrityEventType {
	SERVICE_STARTED = 'service_started',
	SERVICE_STOPPED = 'service_stopped',
	INTEGRITY_VIOLATION = 'integrity_violation',
	HASH_VERIFICATION_STARTED = 'hash_verification_started',
	HASH_VERIFICATION_COMPLETED = 'hash_verification_completed',
	HASH_VERIFICATION_FAILED = 'hash_verification_failed',
	MODIFICATION_DETECTED = 'modification_detected',
	MODIFICATION_TRIGGER_SETUP = 'modification_trigger_setup',
	MODIFICATION_TRIGGER_FAILED = 'modification_trigger_failed',
	KAFKA_ALERT_SENT = 'kafka_alert_sent',
	KAFKA_ALERT_FAILED = 'kafka_alert_failed',
	HASH_MISMATCH_DETECTED = 'hash_mismatch_detected',
	MISSING_HASH_DETECTED = 'missing_hash_detected',
	UNAUTHORIZED_MODIFICATION = 'unauthorized_modification'
}

/**
 * Log integrity service logger
 */
export class LogIntegrityLogger {
	private static createBaseLogData(
		action: string,
		success: boolean,
		req?: Request,
		type: string = 'log_integrity'
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
			component: 'log_integrity_service',
			operation: action
		};
	}

	/**
	 * Log service startup
	 */
	// static async serviceStarted(
	// 	serviceStatus: {
	// 		serviceActive: boolean;
	// 		kafkaTopic: string;
	// 		triggerActive: boolean;
	// 	},
	// 	req?: Request
	// ): Promise<void> {
	// 	try {
	// 		const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
	// 		if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
	// 			Logger.info('Log integrity service started', {
	// 				...this.createBaseLogData(LogIntegrityEventType.SERVICE_STARTED, true, req),
	// 				details: {
	// 					serviceActive: serviceStatus.serviceActive,
	// 					kafkaTopic: serviceStatus.kafkaTopic,
	// 					triggerActive: serviceStatus.triggerActive,
	// 					operation: 'service_startup'
	// 				}
	// 			});
	// 		}
	// 	} catch (error) {
	// 		console.error('Error logging service start:', error);
	// 	}
	// }

	/**
	 * Log service stop
	 */
	static async serviceStopped(req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Log integrity service stopped', {
					...this.createBaseLogData(LogIntegrityEventType.SERVICE_STOPPED, true, req),
					details: {
						operation: 'service_shutdown',
						reason: 'Service cleanup'
					}
				});
			}
		} catch (error) {
			console.error('Error logging service stop:', error);
		}
	}

	/**
	 * Log integrity violation
	 */
	static integrityViolationDetected(
		logId: string,
		violationType: 'UNAUTHORIZED_MODIFICATION' | 'HASH_MISMATCH' | 'MISSING_HASH',
		metadata?: Record<string, unknown>,
		req?: Request
	): void {
		Logger.error('Log integrity violation detected', {
			...this.createBaseLogData(LogIntegrityEventType.INTEGRITY_VIOLATION, false, req),
			details: {
				logId,
				violationType,
				severity: 'CRITICAL',
				operation: 'integrity_check',
				metadata,
				alertSent: true
			}
		});
	}

	/**
	 * Log hash verification start
	 */
	static async hashVerificationStarted(count: number, req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Hash verification started', {
					...this.createBaseLogData(LogIntegrityEventType.HASH_VERIFICATION_STARTED, true, req),
					details: {
						operation: 'hash_verification',
						phase: 'start',
						logsToVerify: count,
						verificationScope: 'recent_logs'
					}
				});
			}
		} catch (error) {
			console.error('Error logging hash verification start:', error);
		}
	}

	/**
	 * Log hash verification completion
	 */
	static async hashVerificationCompleted(
		result: {
			totalChecked: number;
			validLogs: number;
			invalidLogs: number;
			missingHashes: number;
			verificationTime: number;
			invalidLogIds: string[];
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Log integrity verification completed', {
					...this.createBaseLogData(LogIntegrityEventType.HASH_VERIFICATION_COMPLETED, true, req),
					details: {
						operation: 'hash_verification',
						phase: 'complete',
						totalChecked: result.totalChecked,
						validLogs: result.validLogs,
						invalidLogs: result.invalidLogs,
						missingHashes: result.missingHashes,
						verificationTimeMs: result.verificationTime,
						successRate: Math.round((result.validLogs / result.totalChecked) * 100),
						invalidLogCount: result.invalidLogIds.length
					}
				});
			}
		} catch (error) {
			console.error('Error logging hash verification completion:', error);
		}
	}

	/**
	 * Log hash verification failure
	 */
	static hashVerificationFailed(error: string, req?: Request): void {
		Logger.error('Failed to verify log integrity', {
			...this.createBaseLogData(LogIntegrityEventType.HASH_VERIFICATION_FAILED, false, req),
			details: {
				error,
				operation: 'hash_verification',
				phase: 'failed',
				failureReason: error
			}
		});
	}

	/**
	 * Log modification detection
	 */
	static modificationDetected(
		logId: string,
		operationType: string,
		changeDetails: Record<string, unknown>,
		req?: Request
	): void {
		Logger.warn('Log modification detected', {
			...this.createBaseLogData(LogIntegrityEventType.MODIFICATION_DETECTED, false, req),
			details: {
				logId,
				operationType,
				operation: 'modification_detection',
				changeDetails,
				severity: 'HIGH',
				automaticDetection: true
			}
		});
	}

	/**
	 * Log modification trigger setup
	 */
	// static async modificationTriggerSetup(req?: Request): Promise<void> {
	// 	try {
	// 		const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
	// 		if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
	// 			Logger.info('Log modification trigger setup completed', {
	// 				...this.createBaseLogData(LogIntegrityEventType.MODIFICATION_TRIGGER_SETUP, true, req),
	// 				details: {
	// 					operation: 'trigger_setup',
	// 					triggerType: 'mongodb_change_stream',
	// 					monitoredOperations: ['update', 'replace', 'delete'],
	// 					triggerActive: true
	// 				}
	// 			});
	// 		}
	// 	} catch (error) {
	// 		console.error('Error logging modification trigger setup:', error);
	// 	}
	// }

	/**
	 * Log modification trigger setup failure
	 */
	static modificationTriggerSetupFailed(error: string, req?: Request): void {
		Logger.error('Failed to setup log modification trigger', {
			...this.createBaseLogData(LogIntegrityEventType.MODIFICATION_TRIGGER_FAILED, false, req),
			details: {
				error,
				operation: 'trigger_setup',
				phase: 'failed',
				failureReason: error
			}
		});
	}

	/**
	 * Log successful Kafka alert
	 */
	static async kafkaAlertSent(
		logId: string,
		alertType: 'UNAUTHORIZED_MODIFICATION' | 'HASH_MISMATCH' | 'MISSING_HASH',
		kafkaTopic: string,
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Integrity alert sent to Kafka', {
					...this.createBaseLogData(LogIntegrityEventType.KAFKA_ALERT_SENT, true, req),
					details: {
						logId,
						alertType,
						kafkaTopic,
						operation: 'kafka_alert',
						severity: 'CRITICAL'
					}
				});
			}
		} catch (error) {
			console.error('Error logging Kafka alert:', error);
		}
	}

	/**
	 * Log failed Kafka alert
	 */
	static kafkaAlertFailed(
		logId: string,
		alertType: 'UNAUTHORIZED_MODIFICATION' | 'HASH_MISMATCH' | 'MISSING_HASH',
		error: string,
		req?: Request
	): void {
		Logger.error('Failed to send integrity alert to Kafka', {
			...this.createBaseLogData(LogIntegrityEventType.KAFKA_ALERT_FAILED, false, req),
			details: {
				logId,
				alertType,
				error,
				operation: 'kafka_alert',
				phase: 'failed',
				failureReason: error
			}
		});
	}

	/**
	 * Log hash mismatch detection
	 */
	static hashMismatchDetected(
		logId: string,
		logDetails: {
			timestamp?: Date;
			level?: string;
			message?: string;
		},
		req?: Request
	): void {
		Logger.error('Hash mismatch detected for log', {
			...this.createBaseLogData(LogIntegrityEventType.HASH_MISMATCH_DETECTED, false, req),
			details: {
				logId,
				operation: 'hash_verification',
				violationType: 'HASH_MISMATCH',
				logTimestamp: logDetails.timestamp,
				logLevel: logDetails.level,
				logMessage: logDetails.message,
				severity: 'CRITICAL'
			}
		});
	}

	/**
	 * Log missing hash detection
	 */
	static missingHashDetected(
		logId: string,
		logDetails: {
			timestamp?: Date;
			level?: string;
			message?: string;
		},
		error: string,
		req?: Request
	): void {
		Logger.error('Missing hash detected for log', {
			...this.createBaseLogData(LogIntegrityEventType.MISSING_HASH_DETECTED, false, req),
			details: {
				logId,
				operation: 'hash_verification',
				violationType: 'MISSING_HASH',
				logTimestamp: logDetails.timestamp,
				logLevel: logDetails.level,
				logMessage: logDetails.message,
				error,
				severity: 'HIGH'
			}
		});
	}

	/**
	 * Log unauthorized modification detection
	 */
	static unauthorizedModificationDetected(
		logId: string,
		operationType: string,
		changeDetails: {
			documentBefore?: Record<string, unknown> | null;
			documentAfter?: Record<string, unknown> | null;
		},
		req?: Request
	): void {
		Logger.error('Unauthorized log modification detected', {
			...this.createBaseLogData(LogIntegrityEventType.UNAUTHORIZED_MODIFICATION, false, req),
			details: {
				logId,
				operationType,
				operation: 'modification_detection',
				violationType: 'UNAUTHORIZED_MODIFICATION',
				documentBefore: changeDetails.documentBefore,
				documentAfter: changeDetails.documentAfter,
				modificationTimestamp: new Date().toISOString(),
				severity: 'CRITICAL'
			}
		});
	}

	/**
	 * Log service status check
	 */
	static async serviceStatusCheck(
		status: {
			serviceActive: boolean;
			kafkaTopic: string;
			lastVerificationTime: Date | null;
			triggerActive: boolean;
		},
		req?: Request
	): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				Logger.info('Log integrity service status check', {
					...this.createBaseLogData('service_status_check', true, req),
					details: {
						operation: 'status_check',
						serviceActive: status.serviceActive,
						kafkaTopic: status.kafkaTopic,
						lastVerificationTime: status.lastVerificationTime?.toISOString(),
						triggerActive: status.triggerActive,
						healthStatus: status.serviceActive && status.triggerActive ? 'healthy' : 'degraded'
					}
				});
			}
		} catch (error) {
			console.error('Error logging service status:', error);
		}
	}

	/**
	 * Log individual log modification check
	 */
	static async logModificationChecked(logId: string, isValid: boolean, req?: Request): Promise<void> {
		try {
			const logType = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();
			if (logType?.[LOG_TYPE_KEYS.successEvents] === true || !req) {
				const logMethod = isValid ? Logger.info : Logger.warn;
				logMethod('Log modification check completed', {
					...this.createBaseLogData('log_modification_check', isValid, req),
					details: {
						logId,
						operation: 'modification_check',
						integrityValid: isValid,
						checkType: 'individual_log'
					}
				});
			}
		} catch (error) {
			console.error('Error logging modification check:', error);
		}
	}
}
