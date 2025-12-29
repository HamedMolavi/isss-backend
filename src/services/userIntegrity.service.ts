import User from '../db/mongo/models/user';
import { Logger } from '../logger';
import { Kafka, Producer, logLevel } from 'kafkajs';

export interface UserIntegrityAlert {
	userId: string;
	action: 'UNAUTHORIZED_USERNAME_MODIFICATION' | 'USERNAME_HASH_MISMATCH' | 'MISSING_USERNAME_HASH';
	timestamp: Date;
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
	private kafkaProducer: Producer | null = null;
	private readonly INTEGRITY_TOPIC = process.env['USER_INTEGRITY_TOPIC'] || 'user-integrity-alerts';
	private lastVerificationTime: Date | null = null;
	private serviceActive: boolean = false;

	private constructor() {
		this.initKafka();
	}

	private async initKafka(): Promise<void> {
		try {
			const brokers = process.env['KAFKA_BOOTSTRAP']?.split(',');
			if (!brokers?.length) return;

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
		}
	}

	public static getInstance(): UserIntegrityService {
		if (!UserIntegrityService.instance) {
			UserIntegrityService.instance = new UserIntegrityService();
		}
		return UserIntegrityService.instance;
	}

	public getServiceStatus() {
		return {
			serviceActive: this.serviceActive,
			kafkaTopic: this.INTEGRITY_TOPIC,
			lastVerificationTime: this.lastVerificationTime
		};
	}

	public async sendIntegrityAlert(alert: UserIntegrityAlert): Promise<void> {
		if (!this.kafkaProducer || !this.serviceActive) return;

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
		} catch (error) {
			Logger.error('Kafka alert failed', {
				action: 'USER_INTEGRITY_KAFKA_FAILED',
				userId: alert.userId,
				error
			});
		}
	}

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

		const userQuery = User.find({}).sort({ created_date: -1 });
		if (count) userQuery.limit(count);
		const users = await userQuery.lean();

		result.totalChecked = users.length;

		for (const user of users) {
			const userId = user._id.toString();
			try {
				const isValid = await User.verifyUsernameIntegrity(userId);
				if (isValid) {
					result.validUsers++;
				} else {
					result.invalidUsers++;
					result.invalidUserIds.push(userId);
				}
			} catch {
				result.missingHashes++;
				result.invalidUserIds.push(userId);
			}
		}

		result.verificationTime = Date.now() - startTime;
		this.lastVerificationTime = new Date();

		return result;
	}

	public async checkUsernameModification(userId: string): Promise<boolean> {
		try {
			const isValid = await User.verifyUsernameIntegrity(userId);

			if (!isValid) {
				await this.sendIntegrityAlert({
					userId,
					action: 'UNAUTHORIZED_USERNAME_MODIFICATION',
					timestamp: new Date()
				});
			}

			return isValid;
		} catch (error) {
			Logger.error('Username check failed', { action: 'USERNAME_CHECK_FAILED', userId, error });
			return false;
		}
	}

	public async cleanup(): Promise<void> {
		if (this.kafkaProducer) {
			await this.kafkaProducer.disconnect();
		}
	}
}
