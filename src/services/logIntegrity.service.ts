import { Log } from '../db/mongo/models/secLog';
import { Logger } from '../logger';
import { LogIntegrityLogger } from '../logger/logIntegrity.logger';
import { Kafka, Producer, logLevel } from 'kafkajs';
import {
	ChangeStreamDocument,
	ChangeStreamUpdateDocument,
	ChangeStreamReplaceDocument,
	ChangeStreamDeleteDocument
} from 'mongodb';

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
	private kafkaProducer: Producer;
	private readonly INTEGRITY_TOPIC = process.env['LOG_INTEGRITY_TOPIC'] || 'log-integrity-alerts';
	private lastVerificationTime: Date | null = null;
	private triggerActive: boolean = false;
	private serviceActive: boolean = false;

	constructor() {
		// Initialize Kafka producer for integrity alerts
		this.kafkaProducer = new Kafka({
			logLevel: logLevel.ERROR,
			brokers: process.env['KAFKA_BOOTSTRAP'].split(',')
		}).producer({
			retry: {
				restartOnFailure: async (err) => {
					console.log('Kafka Connect Failure:', err);
					return false;
				}
			},
			allowAutoTopicCreation: true
		});
		this.kafkaProducer
			.connect()
			.then(() => {
				this.serviceActive = true;
				// Log service startup
				LogIntegrityLogger.serviceStarted({
					serviceActive: this.serviceActive,
					kafkaTopic: this.INTEGRITY_TOPIC,
					triggerActive: this.triggerActive
				});
			})
			.catch(() => {
				this.serviceActive = false;
			});
	}

	public static getInstance(): LogIntegrityService {
		if (!LogIntegrityService.instance) {
			LogIntegrityService.instance = new LogIntegrityService();
		}
		return LogIntegrityService.instance;
	}

	/**
	 * Get service status information
	 */
	public async getServiceStatus() {
		const status = {
			serviceActive: this.serviceActive,
			kafkaTopic: this.INTEGRITY_TOPIC,
			lastVerificationTime: this.lastVerificationTime,
			triggerActive: this.triggerActive
		};

		// Use LogIntegrityLogger for status check
		await LogIntegrityLogger.serviceStatusCheck(status);

		return status;
	}

	/**
	 * Send integrity alert to Kafka
	 */
	public async sendIntegrityAlert(alert: LogIntegrityAlert): Promise<void> {
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

			// Use LogIntegrityLogger for successful Kafka alert
			await LogIntegrityLogger.kafkaAlertSent(alert.logId, alert.action, this.INTEGRITY_TOPIC);
		} catch (error) {
			// Use LogIntegrityLogger for failed Kafka alert
			LogIntegrityLogger.kafkaAlertFailed(
				alert.logId,
				alert.action,
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	/**
	 * Verify hash integrity for the last N logs
	 */
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
			// Use LogIntegrityLogger for verification start
			await LogIntegrityLogger.hashVerificationStarted(count);

			// Get the last N logs
			const recentLogs = await Log.find({}).sort({ timestamp: -1 }).limit(count).lean();

			result.totalChecked = recentLogs.length;

			// Verify each log's integrity
			for (const log of recentLogs) {
				const logId = log._id.toString();

				try {
					// Use the properly typed static method
					const isValid = await Log.verifyIntegrity(logId);

					if (isValid) {
						result.validLogs++;
					} else {
						result.invalidLogs++;
						result.invalidLogIds.push(logId);

						// Use LogIntegrityLogger for hash mismatch
						LogIntegrityLogger.hashMismatchDetected(logId, {
							timestamp: log.timestamp,
							level: log.level,
							message: log.message
						});

						// Send alert for invalid hash
						await this.sendIntegrityAlert({
							logId,
							action: 'HASH_MISMATCH',
							timestamp: new Date(),
							metadata: {
								logTimestamp: log.timestamp,
								logLevel: log.level,
								logMessage: log.message
							}
						});
					}
				} catch (error) {
					result.missingHashes++;
					result.invalidLogIds.push(logId);

					// Use LogIntegrityLogger for missing hash
					LogIntegrityLogger.missingHashDetected(
						logId,
						{
							timestamp: log.timestamp,
							level: log.level,
							message: log.message
						},
						error instanceof Error ? error.message : 'Unknown error'
					);

					// Send alert for missing hash
					await this.sendIntegrityAlert({
						logId,
						action: 'MISSING_HASH',
						timestamp: new Date(),
						metadata: {
							logTimestamp: log.timestamp,
							logLevel: log.level,
							logMessage: log.message,
							error: error instanceof Error ? error.message : 'Unknown error'
						}
					});
				}
			}

			result.verificationTime = Date.now() - startTime;

			// Use LogIntegrityLogger for verification completion
			await LogIntegrityLogger.hashVerificationCompleted(result);

			this.lastVerificationTime = new Date();

			return result;
		} catch (error) {
			// Use LogIntegrityLogger for verification failure
			LogIntegrityLogger.hashVerificationFailed(error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Check if a specific log has been modified
	 */
	public async checkLogModification(logId: string): Promise<boolean> {
		try {
			const isValid = await Log.verifyIntegrity(logId);

			// Use LogIntegrityLogger for modification check
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
				details: {
					logId,
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
			return false;
		}
	}

	/**
	 * Setup MongoDB change stream to monitor log modifications
	 */
	public setupLogModificationTrigger(): void {
		try {
			const changeStream = Log.watch(
				[
					{
						$match: {
							operationType: { $in: ['update', 'replace', 'delete'] }
						}
					}
				],
				{
					fullDocument: 'updateLookup',
					fullDocumentBeforeChange: 'whenAvailable'
				}
			);

			changeStream.on('change', async (change: ChangeStreamDocument) => {
				// Type guard to ensure we have documentKey
				if ('documentKey' in change) {
					const typedChange = change as
						| ChangeStreamUpdateDocument
						| ChangeStreamReplaceDocument
						| ChangeStreamDeleteDocument;
					const logId = typedChange.documentKey._id.toString();

					// Extract before and after documents with proper typing
					const extendedChange = change as ChangeStreamDocument & {
						fullDocumentBeforeChange?: Record<string, unknown> | null;
						fullDocument?: Record<string, unknown> | null;
					};
					const documentBefore = extendedChange.fullDocumentBeforeChange || null;
					const documentAfter = extendedChange.fullDocument || null;

					// Use LogIntegrityLogger for modification detection
					LogIntegrityLogger.modificationDetected(
						logId,
						change.operationType,
						JSON.parse(JSON.stringify(change))
					);

					// Use LogIntegrityLogger for unauthorized modification
					LogIntegrityLogger.unauthorizedModificationDetected(logId, change.operationType, {
						documentBefore,
						documentAfter
					});

					// Send immediate alert for any modification attempt
					await this.sendIntegrityAlert({
						logId,
						action: 'UNAUTHORIZED_MODIFICATION',
						timestamp: new Date(),
						metadata: {
							operationType: change.operationType,
							changeDetails: change,
							documentBefore,
							documentAfter,
							modificationTimestamp: new Date().toISOString()
						}
					});
				}
			});

			changeStream.on('error', (error: Error) => {
				Logger.error('Log modification trigger error', {
					action: 'LOG_MODIFICATION_TRIGGER_ERROR',
					details: {
						error: error instanceof Error ? error.message : 'Unknown error'
					}
				});
			});

			// Use LogIntegrityLogger for trigger setup
			LogIntegrityLogger.modificationTriggerSetup();

			this.triggerActive = true;
		} catch (error) {
			// Use LogIntegrityLogger for trigger setup failure
			LogIntegrityLogger.modificationTriggerSetupFailed(
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	/**
	 * Cleanup method to disconnect Kafka producer
	 */
	public async cleanup(): Promise<void> {
		try {
			await this.kafkaProducer.disconnect();
			// Use LogIntegrityLogger for service stop
			await LogIntegrityLogger.serviceStopped();
		} catch (error) {
			Logger.error('Failed to cleanup LogIntegrityService', {
				action: 'LOG_INTEGRITY_SERVICE_CLEANUP_FAILED',
				details: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		}
	}
}
