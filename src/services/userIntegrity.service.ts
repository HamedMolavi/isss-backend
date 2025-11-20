import User from '../db/mongo/models/user';
import { Logger } from '../logger';
import { Kafka, Producer, logLevel } from 'kafkajs';

export interface UserIntegrityAlert {
	userId: string;
	action: 'UNAUTHORIZED_USERNAME_MODIFICATION' | 'USERNAME_HASH_MISMATCH' | 'MISSING_USERNAME_HASH';
	timestamp: Date;
	originalHash?: string;
	currentHash?: string;
	metadata?: Record<string, unknown>;
}

export interface UsernameVerificationResult {
	totalChecked: number;
	validUsers: number;
	invalidUsers: number;
	missingHashes: number;
	verificationTime: number;
	invalidUserIds: string[];
}

export class UserIntegrityService {
	private static instance: UserIntegrityService;
	private kafkaProducer: Producer;
	private readonly INTEGRITY_TOPIC = process.env['USER_INTEGRITY_TOPIC'] || 'user-integrity-alerts';
	private lastVerificationTime: Date | null = null;
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
				Logger.info('User integrity service started', {
					action: 'USER_INTEGRITY_SERVICE_STARTED',
					details: {
						serviceActive: this.serviceActive,
						kafkaTopic: this.INTEGRITY_TOPIC
					}
				});
			})
			.catch(() => {
				this.serviceActive = false;
			});
	}

	public static getInstance(): UserIntegrityService {
		if (!UserIntegrityService.instance) {
			UserIntegrityService.instance = new UserIntegrityService();
		}
		return UserIntegrityService.instance;
	}

	/**
	 * Get service status information
	 */
	public async getServiceStatus() {
		const status = {
			serviceActive: this.serviceActive,
			kafkaTopic: this.INTEGRITY_TOPIC,
			lastVerificationTime: this.lastVerificationTime
		};

		// Log status check
		Logger.info('User integrity service status checked', {
			action: 'USER_INTEGRITY_STATUS_CHECK',
			details: status
		});

		return status;
	}

	/**
	 * Send integrity alert to Kafka
	 */
	public async sendIntegrityAlert(alert: UserIntegrityAlert): Promise<void> {
		try {
			await this.kafkaProducer.send({
				topic: this.INTEGRITY_TOPIC,
				messages: [
					{
						key: alert.userId,
						value: JSON.stringify({
							...alert,
							timestamp: alert.timestamp.toISOString(),
							source: 'user-integrity-service',
							severity: 'CRITICAL'
						})
					}
				]
			});

			// Log successful Kafka alert
			Logger.info('User integrity alert sent to Kafka', {
				action: 'USER_INTEGRITY_KAFKA_ALERT_SENT',
				details: {
					userId: alert.userId,
					alertAction: alert.action,
					topic: this.INTEGRITY_TOPIC
				}
			});
		} catch (error) {
			// Log failed Kafka alert
			Logger.error('Failed to send user integrity alert to Kafka', {
				action: 'USER_INTEGRITY_KAFKA_ALERT_FAILED',
				details: {
					userId: alert.userId,
					alertAction: alert.action,
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		}
	}

	/**
	 * Verify username integrity for all users or a specific count
	 */
	public async verifyUsernamesIntegrity(count?: number): Promise<UsernameVerificationResult> {
		const startTime = Date.now();
		const result: UsernameVerificationResult = {
			totalChecked: 0,
			validUsers: 0,
			invalidUsers: 0,
			missingHashes: 0,
			verificationTime: 0,
			invalidUserIds: []
		};

		try {
			// Log verification start
			Logger.info('Username integrity verification started', {
				action: 'USERNAME_INTEGRITY_VERIFICATION_STARTED',
				details: { count: count || 'all' }
			});

			// Get users - either all or limited count
			const userQuery = User.find({}).sort({ created_date: -1 });
			if (count) {
				userQuery.limit(count);
			}
			const users = await userQuery.lean();

			result.totalChecked = users.length;

			// Verify each user's username integrity
			for (const user of users) {
				const userId = user._id.toString();

				try {
					const isValid = await User.verifyUsernameIntegrity(userId);

					if (isValid) {
						result.validUsers++;
					} else {
						result.invalidUsers++;
						result.invalidUserIds.push(userId);

						// Log hash mismatch
						Logger.warn('Username hash mismatch detected', {
							action: 'USERNAME_HASH_MISMATCH_DETECTED',
							details: {
								userId,
								username: user.username,
								created_date: user.created_date
							}
						});

						// Send alert for invalid hash
						// await this.sendIntegrityAlert({
						// 	userId,
						// 	action: 'USERNAME_HASH_MISMATCH',
						// 	timestamp: new Date(),
						// 	metadata: {
						// 		username: user.username,
						// 		created_date: user.created_date,
						// 		role: user.role
						// 	}
						// });
					}
				} catch (error) {
					result.missingHashes++;
					result.invalidUserIds.push(userId);

					// Log missing hash
					Logger.warn('Missing username hash detected', {
						action: 'MISSING_USERNAME_HASH_DETECTED',
						details: {
							userId,
							username: user.username,
							error: error instanceof Error ? error.message : 'Unknown error'
						}
					});

					// Send alert for missing hash
					// await this.sendIntegrityAlert({
					// 	userId,
					// 	action: 'MISSING_USERNAME_HASH',
					// 	timestamp: new Date(),
					// 	metadata: {
					// 		username: user.username,
					// 		created_date: user.created_date,
					// 		role: user.role,
					// 		error: error instanceof Error ? error.message : 'Unknown error'
					// 	}
					// });
				}
			}

			result.verificationTime = Date.now() - startTime;

			// Log verification completion
			Logger.info('Username integrity verification completed', {
				action: 'USERNAME_INTEGRITY_VERIFICATION_COMPLETED',
				details: result
			});

			this.lastVerificationTime = new Date();

			return result;
		} catch (error) {
			// Log verification failure
			Logger.error('Username integrity verification failed', {
				action: 'USERNAME_INTEGRITY_VERIFICATION_FAILED',
				details: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
			throw error;
		}
	}

	/**
	 * Check if a specific user's username has been modified
	 */
	public async checkUsernameModification(userId: string): Promise<boolean> {
		try {
			const isValid = await User.verifyUsernameIntegrity(userId);

			// Log modification check
			Logger.info('Username modification check completed', {
				action: 'USERNAME_MODIFICATION_CHECKED',
				details: {
					userId,
					isValid
				}
			});

			if (!isValid) {
				await this.sendIntegrityAlert({
					userId,
					action: 'UNAUTHORIZED_USERNAME_MODIFICATION',
					timestamp: new Date()
				});
			}

			return isValid;
		} catch (error) {
			Logger.error('Failed to check username modification', {
				action: 'USERNAME_MODIFICATION_CHECK_FAILED',
				details: {
					userId,
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
			return false;
		}
	}

	/**
	 * Cleanup method to disconnect Kafka producer
	 */
	public async cleanup(): Promise<void> {
		try {
			await this.kafkaProducer.disconnect();
			Logger.info('User integrity service stopped', {
				action: 'USER_INTEGRITY_SERVICE_STOPPED'
			});
		} catch (error) {
			Logger.error('Failed to cleanup UserIntegrityService', {
				action: 'USER_INTEGRITY_SERVICE_CLEANUP_FAILED',
				details: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			});
		}
	}
}
