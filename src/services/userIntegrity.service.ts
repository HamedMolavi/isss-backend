import User, { getUserIntegritySnapshot } from '../db/mongo/models/user';
import { SQLite } from '../db/sqlite';
import { JSON_hash } from '../tools/utils.tools';
import { Logger } from '../logger';

export interface UsernameVerificationResult {
	totalChecked: number;
	validUsers: number;
	invalidUsers: number;
	missingHashes: number;
	deletedUsers: number;
	verificationTime: number;
	invalidUserIds: string[];
	invalidUsernames: string[];
}

export interface UserIntegrityOverview {
	detected: boolean;
	status: 'OK' | 'WARNING' | 'UNAVAILABLE';
	severity: 'NONE' | 'CRITICAL';
	title: string;
	message: string;
	checkedAt: string;
	summary: {
		protectedRecords: number;
		storedRecords: number;
		modifiedRecords: number;
		deletedRecords: number;
		unprotectedRecords: number;
	};
	affectedUserIds: string[];
	affectedUsernames: string[];
}

const BASELINE_KEY = 'user_record_integrity_v1';

export class UserIntegrityService {
	private static instance: UserIntegrityService;
	private lastVerificationTime: Date | null = null;
	private monitoringTimer: NodeJS.Timeout | null = null;
	private lastAlertSignature = '';

	private constructor() {}

	public static getInstance(): UserIntegrityService {
		if (!UserIntegrityService.instance) UserIntegrityService.instance = new UserIntegrityService();
		return UserIntegrityService.instance;
	}

	public getServiceStatus() {
		return {
			serviceActive: true,
			lastVerificationTime: this.lastVerificationTime,
			monitoringActive: Boolean(this.monitoringTimer)
		};
	}

	public async initializeProtection(): Promise<void> {
		await SQLite.createUserRecordIntegrityTables();
		const marker = await SQLite.queryAll<{ value: string }>('SELECT value FROM IntegrityMeta WHERE key = ?', [
			BASELINE_KEY
		]);
		if (marker.length) return;

		const users = await User.find({}).select('+otp_secret +otp_auth_url').lean();
		for (const user of users) {
			const hash = JSON_hash(getUserIntegritySnapshot(user as never))?.hash;
			if (hash) {
				await SQLite.execute('INSERT OR REPLACE INTO UserRecordHash (_id, hash) VALUES (?, ?)', [
					user._id.toString(),
					hash
				]);
			}
		}
		await SQLite.execute('INSERT OR REPLACE INTO IntegrityMeta (key, value) VALUES (?, ?)', [
			BASELINE_KEY,
			new Date().toISOString()
		]);
	}

	public startMonitoring(
		intervalMs = Number(process.env['USER_INTEGRITY_CHECK_INTERVAL_MS']) || 60_000
	): void {
		if (this.monitoringTimer) return;
		this.monitoringTimer = setInterval(
			() => {
				void this.getIntegrityOverview();
			},
			Math.max(intervalMs, 10_000)
		);
		this.monitoringTimer.unref();
	}

	public async getIntegrityOverview(): Promise<UserIntegrityOverview> {
		try {
			const [users, storedHashes] = await Promise.all([
				User.find({}).select('+otp_secret +otp_auth_url').lean(),
				SQLite.queryAll<{ _id: string; hash: string }>('SELECT _id, hash FROM UserRecordHash')
			]);
			const hashById = new Map(storedHashes.map((row) => [row._id, row.hash]));
			const usernameById = new Map(
				users.map((user) => [user._id.toString(), String(user.username || '')])
			);
			const userIds = new Set(users.map((user) => user._id.toString()));
			const modifiedIds: string[] = [];
			const unprotectedIds: string[] = [];

			for (const user of users) {
				const id = user._id.toString();
				const storedHash = hashById.get(id);
				if (!storedHash) {
					unprotectedIds.push(id);
					continue;
				}
				const currentHash = JSON_hash(getUserIntegritySnapshot(user as never))?.hash;
				if (!currentHash || currentHash !== storedHash) modifiedIds.push(id);
			}

			const deletedIds = storedHashes.filter((row) => !userIds.has(row._id)).map((row) => row._id);
			const affectedIds = [...modifiedIds, ...deletedIds, ...unprotectedIds];
			const detected = affectedIds.length > 0;
			this.lastVerificationTime = new Date();

			if (detected) {
				this.reportViolation(modifiedIds, deletedIds, unprotectedIds, usernameById);
			} else {
				this.lastAlertSignature = '';
			}

			return {
				detected,
				status: detected ? 'WARNING' : 'OK',
				severity: detected ? 'CRITICAL' : 'NONE',
				title: detected ? 'هشدار دستکاری حساب‌های کاربری' : 'یکپارچگی حساب‌های کاربری سالم است',
				message: detected
					? 'تغییر، حذف یا ایجاد غیرمجاز در رکوردهای حساب کاربری شناسایی شد. لطفاً فوراً بررسی کنید.'
					: 'هیچ تغییر غیرمجازی در رکوردهای حساب کاربری شناسایی نشد.',
				checkedAt: this.lastVerificationTime.toISOString(),
				summary: {
					protectedRecords: storedHashes.length,
					storedRecords: users.length,
					modifiedRecords: modifiedIds.length,
					deletedRecords: deletedIds.length,
					unprotectedRecords: unprotectedIds.length
				},
				affectedUserIds: affectedIds.slice(0, 100),
				affectedUsernames: affectedIds
					.map((id) => usernameById.get(id))
					.filter((username): username is string => Boolean(username))
					.slice(0, 100)
			};
		} catch (error) {
			Logger.error('User integrity verification failed', {
				type: 'user_management',
				action: 'user_integrity_check_failed',
				success: false,
				username: 'security-monitor',
				error: error instanceof Error ? error.message : String(error),
				_disableFilter: true
			});
			return {
				detected: false,
				status: 'UNAVAILABLE',
				severity: 'CRITICAL',
				title: 'پایش یکپارچگی حساب‌های کاربری در دسترس نیست',
				message: 'بررسی دستکاری حساب‌های کاربری انجام نشد؛ وضعیت پایگاه داده و SQLite بررسی شود.',
				checkedAt: new Date().toISOString(),
				summary: {
					protectedRecords: 0,
					storedRecords: 0,
					modifiedRecords: 0,
					deletedRecords: 0,
					unprotectedRecords: 0
				},
				affectedUserIds: [],
				affectedUsernames: []
			};
		}
	}

	private reportViolation(
		modifiedIds: string[],
		deletedIds: string[],
		unprotectedIds: string[],
		usernameById: Map<string, string>
	) {
		const signature = [...modifiedIds, ...deletedIds, ...unprotectedIds].sort().join(':');
		if (signature === this.lastAlertSignature) return;
		this.lastAlertSignature = signature;
		const affectedUserIds = [...modifiedIds, ...deletedIds, ...unprotectedIds];
		const affectedUsernames = affectedUserIds
			.map((id) => usernameById.get(id))
			.filter((username): username is string => Boolean(username));

		Logger.error('دستکاری غیرمجاز حساب کاربری شناسایی شد', {
			type: 'user_management',
			action: 'user_integrity_violation',
			success: false,
			severity: 'CRITICAL',
			username: affectedUsernames[0] || 'security-monitor',
			userId: affectedUserIds[0] || 'unknown',
			details: {
				modifiedRecords: modifiedIds.length,
				deletedRecords: deletedIds.length,
				unprotectedRecords: unprotectedIds.length,
				affectedUserIds,
				affectedUsernames
			},
			_disableFilter: true
		});

	}

	public async verifyUsernamesIntegrity(count?: number): Promise<UsernameVerificationResult> {
		const startedAt = Date.now();
		const overview = await this.getIntegrityOverview();
		const totalChecked = count
			? Math.min(count, overview.summary.storedRecords)
			: overview.summary.storedRecords;
		return {
			totalChecked,
			validUsers: Math.max(
				0,
				totalChecked - overview.summary.modifiedRecords - overview.summary.unprotectedRecords
			),
			invalidUsers: overview.summary.modifiedRecords,
			missingHashes: overview.summary.unprotectedRecords,
			deletedUsers: overview.summary.deletedRecords,
			verificationTime: Date.now() - startedAt,
			invalidUserIds: overview.affectedUserIds,
			invalidUsernames: overview.affectedUsernames
		};
	}

	public async checkUsernameModification(userId: string): Promise<boolean> {
		const isValid = await User.verifyIntegrity(userId);
		if (!isValid) {
			await this.getIntegrityOverview();
		}
		return isValid;
	}

	public cleanup(): void {
		if (this.monitoringTimer) clearInterval(this.monitoringTimer);
		this.monitoringTimer = null;
	}
}
