import { Log } from '../db/mongo/models/secLog';
import { Logger } from '../logger';
import { LogIntegrityLogger } from '../logger/logIntegrity.logger';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { ChangeStreamDocument } from 'mongodb';

export interface LogIntegrityAlert {
	logId: string;
	action: 'UNAUTHORIZED_MODIFICATION' | 'HASH_MISMATCH' | 'MISSING_HASH';
	timestamp: Date;
	originalHash?: string;
	currentHash?: string;
	metadata?: Record<string, unknown>;
}

export interface HashVerificationResult {
	totalChecked: number;
	validLogs: number;
	invalidLogs: number;
	missingHashes: number;
	verificationTime: number;
	invalidLogIds: string[];
}

export class LogIntegrityService {
	private static instance: LogIntegrityService;
	private kafkaProducer: Producer | null = null;
	private readonly INTEGRITY_TOPIC = process.env['LOG_INTEGRITY_TOPIC'] || 'log-integrity-alerts';
	private lastVerificationTime: Date | null = null;
	private triggerActive: boolean = false;
	private serviceActive: boolean = false;

	private constructor() {
		this.initKafka();
	}

	private async initKafka(): Promise<void> {
		try {
			const brokers = process.env['KAFKA_BOOTSTRAP']?.split(',');
			if (!brokers?.length) {
				console.warn('KAFKA_BOOTSTRAP not configured, alerts will be logged only');
				return;
			}

			this.kafkaProducer = new Kafka({
				logLevel: logLevel.ERROR,
				brokers
			}).producer({
				retry: { restartOnFailure: async () => false },
				allowAutoTopicCreation: true
			});

			await this.kafkaProducer.connect();
			this.serviceActive = true;
		} catch {
			this.serviceActive = false;
			console.warn('Kafka connection failed, alerts will be logged only');
		}
	}

	public static getInstance(): LogIntegrityService {
		if (!LogIntegrityService.instance) {
			LogIntegrityService.instance = new LogIntegrityService();
		}
		return LogIntegrityService.instance;
	}

	public getServiceStatus() {
		return {
			serviceActive: this.serviceActive,
			kafkaTopic: this.INTEGRITY_TOPIC,
			lastVerificationTime: this.lastVerificationTime,
			triggerActive: this.triggerActive
		};
	}

	public async sendIntegrityAlert(alert: LogIntegrityAlert): Promise<void> {
		if (!this.kafkaProducer || !this.serviceActive) return;

		try {
			await this.kafkaProducer.send({
				topic: this.INTEGRITY_TOPIC,
				messages: [
					{
						key: alert.logId,
						value: JSON.stringify({
							...alert,
							timestamp: alert.timestamp.toISOString(),
							source: 'log-integrity-service',
							severity: 'CRITICAL'
						})
					}
				]
			});
		} catch (error) {
			LogIntegrityLogger.kafkaAlertFailed(
				alert.logId,
				alert.action,
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	public async verifyRecentLogsIntegrity(count: number = 1000): Promise<HashVerificationResult> {
		const startTime = Date.now();
		const result: HashVerificationResult = {
			totalChecked: 0,
			validLogs: 0,
			invalidLogs: 0,
			missingHashes: 0,
			verificationTime: 0,
			invalidLogIds: []
		};

		try {
			await LogIntegrityLogger.hashVerificationStarted(count);

			const recentLogs = await Log.find({}).sort({ timestamp: -1 }).limit(count).lean();
			result.totalChecked = recentLogs.length;

			for (const log of recentLogs) {
				const logId = log._id.toString();
				await this.verifySingleLog(logId, log, result);
			}

			result.verificationTime = Date.now() - startTime;
			await LogIntegrityLogger.hashVerificationCompleted(result);
			this.lastVerificationTime = new Date();

			return result;
		} catch (error) {
			LogIntegrityLogger.hashVerificationFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	private async verifySingleLog(
		logId: string,
		log: { timestamp?: Date; level: string; message: string },
		result: HashVerificationResult
	): Promise<void> {
		try {
			const isValid = await Log.verifyIntegrity(logId);

			if (isValid) {
				result.validLogs++;
			} else {
				result.invalidLogs++;
				result.invalidLogIds.push(logId);
				LogIntegrityLogger.hashMismatchDetected(logId, log);
				await this.sendIntegrityAlert({
					logId,
					action: 'HASH_MISMATCH',
					timestamp: new Date(),
					metadata: { logTimestamp: log.timestamp, logLevel: log.level, logMessage: log.message }
				});
			}
		} catch (error) {
			result.missingHashes++;
			result.invalidLogIds.push(logId);
			LogIntegrityLogger.missingHashDetected(
				logId,
				log,
				error instanceof Error ? error.message : 'Unknown error'
			);
			await this.sendIntegrityAlert({
				logId,
				action: 'MISSING_HASH',
				timestamp: new Date(),
				metadata: { logTimestamp: log.timestamp, logLevel: log.level, logMessage: log.message }
			});
		}
	}

	public async checkLogModification(logId: string): Promise<boolean> {
		try {
			const isValid = await Log.verifyIntegrity(logId);
			await LogIntegrityLogger.logModificationChecked(logId, isValid);

			if (!isValid) {
				await this.sendIntegrityAlert({
					logId,
					action: 'UNAUTHORIZED_MODIFICATION',
					timestamp: new Date()
				});
			}

			return isValid;
		} catch (error) {
			Logger.error('Failed to check log modification', {
				action: 'LOG_MODIFICATION_CHECK_FAILED',
				details: { logId, error: error instanceof Error ? error.message : 'Unknown error' }
			});
			return false;
		}
	}

	public setupLogModificationTrigger(): void {
		try {
			const changeStream = Log.watch(
				[{ $match: { operationType: { $in: ['update', 'replace', 'delete'] } } }],
				{ fullDocument: 'updateLookup', fullDocumentBeforeChange: 'whenAvailable' }
			);

			changeStream.on('change', async (change: ChangeStreamDocument) => {
				if (!('documentKey' in change)) return;

				const logId = (change.documentKey as { _id: { toString(): string } })._id.toString();
				const extendedChange = change as ChangeStreamDocument & {
					fullDocumentBeforeChange?: Record<string, unknown> | null;
					fullDocument?: Record<string, unknown> | null;
				};

				LogIntegrityLogger.unauthorizedModificationDetected(logId, change.operationType, {
					documentBefore: extendedChange.fullDocumentBeforeChange || null,
					documentAfter: extendedChange.fullDocument || null
				});

				await this.sendIntegrityAlert({
					logId,
					action: 'UNAUTHORIZED_MODIFICATION',
					timestamp: new Date(),
					metadata: {
						operationType: change.operationType,
						documentBefore: extendedChange.fullDocumentBeforeChange,
						documentAfter: extendedChange.fullDocument
					}
				});
			});

			changeStream.on('error', (error: Error) => {
				Logger.error('Log modification trigger error', {
					action: 'LOG_MODIFICATION_TRIGGER_ERROR',
					details: { error: error.message }
				});
			});

			this.triggerActive = true;
		} catch (error) {
			LogIntegrityLogger.modificationTriggerSetupFailed(
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	public async cleanup(): Promise<void> {
		try {
			if (this.kafkaProducer) {
				await this.kafkaProducer.disconnect();
			}
			await LogIntegrityLogger.serviceStopped();
		} catch (error) {
			Logger.error('Failed to cleanup LogIntegrityService', {
				action: 'LOG_INTEGRITY_SERVICE_CLEANUP_FAILED',
				details: { error: error instanceof Error ? error.message : 'Unknown error' }
			});
		}
	}
}
