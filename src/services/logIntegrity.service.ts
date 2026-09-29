import { Log } from '../db/mongo/models/secLog';
import { Logger } from '../logger';
import { LogIntegrityLogger } from '../logger/logIntegrity.logger';
import { ChangeStreamDocument } from 'mongodb';
import { SQLite } from '../db/sqlite';
import { JSON_hash } from '../tools/utils.tools';
import { readFallbackLogs } from './fallbackLog.service';

export interface HashVerificationResult {
	totalChecked: number;
	validLogs: number;
	invalidLogs: number;
	missingHashes: number;
	verificationTime: number;
	invalidLogIds: string[];
}

export interface LogIntegrityOverview {
	detected: boolean;
	status: 'OK' | 'WARNING' | 'UNAVAILABLE';
	severity: 'NONE' | 'CRITICAL';
	title: string;
	message: string;
	checkedAt: Date;
	summary: {
		protectedRecords: number;
		storedRecords: number;
		fallbackRecords: number;
		modifiedRecords: number;
		deletedRecords: number;
		unprotectedRecords: number;
	};
	affectedLogIds: string[];
}

export class LogIntegrityService {
	private static instance: LogIntegrityService;
	private lastVerificationTime: Date | null = null;
	private triggerActive: boolean = false;
	private overviewPromise: Promise<LogIntegrityOverview> | null = null;
	private overviewCache: { value: LogIntegrityOverview; expiresAt: number } | null = null;
	private lastOverviewAlertSignature: string | null = null;

	private constructor() {}

	public static getInstance(): LogIntegrityService {
		if (!LogIntegrityService.instance) {
			LogIntegrityService.instance = new LogIntegrityService();
		}
		return LogIntegrityService.instance;
	}

	public getServiceStatus() {
		return {
			serviceActive: true,
			lastVerificationTime: this.lastVerificationTime,
			triggerActive: this.triggerActive
		};
	}

	public async disableLegacyAutomaticDeletion(): Promise<void> {
		try {
			const indexes = await Log.collection.indexes();
			const ttlIndexes = indexes.filter(
				(index) =>
					index.expireAfterSeconds !== undefined && Object.keys(index.key || {}).includes('expires_at')
			);
			for (const index of ttlIndexes) {
				if (index.name) await Log.collection.dropIndex(index.name);
			}
			if (ttlIndexes.length > 0) {
				Logger.systemOperation('Legacy automatic log deletion disabled', {
					type: 'log_integrity',
					action: 'automatic_log_deletion_disabled',
					success: true,
					details: { removedIndexes: ttlIndexes.map((index) => index.name) }
				});
			}
		} catch (error) {
			Logger.error('Failed to disable legacy automatic log deletion', {
				type: 'log_integrity',
				action: 'automatic_log_deletion_disable_failed',
				success: false,
				details: { error: error instanceof Error ? error.message : 'Unknown error' }
			});
		}
	}

	/**
	 * Produces a UI-safe integrity summary. Unlike the previous verifier, this
	 * also starts from the protected SQLite hashes, so records removed from
	 * MongoDB are detectable instead of disappearing silently.
	 */
	public async getIntegrityOverview(): Promise<LogIntegrityOverview> {
		if (this.overviewCache && this.overviewCache.expiresAt > Date.now()) {
			return this.overviewCache.value;
		}
		if (this.overviewPromise) return this.overviewPromise;

		this.overviewPromise = this.buildIntegrityOverview().finally(() => {
			this.overviewPromise = null;
		});
		return this.overviewPromise;
	}

	private async buildIntegrityOverview(): Promise<LogIntegrityOverview> {
		const checkedAt = new Date();
		try {
			const [hashRows, storedLogs, fallbackLogs] = await Promise.all([
				SQLite.queryAll<{ _id: string; hash: string }>('SELECT _id, hash FROM Hash'),
				Log.find({}, { level: 1, timestamp: 1, message: 1, action: 1, metadata: 1, expires_at: 1 })
					.lean()
					.exec(),
				readFallbackLogs()
			]);

			const storedById = new Map(storedLogs.map((log) => [log._id.toString(), log]));
			const fallbackIds = new Set(
				fallbackLogs.map((log) => log._id?.toString()).filter((id): id is string => Boolean(id))
			);
			const deletedIds: string[] = [];
			const modifiedIds: string[] = [];
			const protectedIds = new Set(hashRows.map((row) => row._id));
			const unprotectedIds = storedLogs
				.map((log) => log._id.toString())
				.filter((id) => !protectedIds.has(id));

			for (const protectedRecord of hashRows) {
				const storedLog = storedById.get(protectedRecord._id);
				if (!storedLog) {
					if (!fallbackIds.has(protectedRecord._id)) deletedIds.push(protectedRecord._id);
					continue;
				}

				const calculated = JSON_hash({
					_id: storedLog._id.toString(),
					level: storedLog.level,
					timestamp: storedLog.timestamp,
					message: storedLog.message,
					action: storedLog.action,
					metadata: storedLog.metadata,
					expires_at: storedLog.expires_at
				})?.hash;
				if (!calculated || calculated !== protectedRecord.hash) modifiedIds.push(protectedRecord._id);
			}

			const affectedIds = [...modifiedIds, ...deletedIds, ...unprotectedIds];
			const detected = affectedIds.length > 0;
			const value: LogIntegrityOverview = {
				detected,
				status: detected ? 'WARNING' : 'OK',
				severity: detected ? 'CRITICAL' : 'NONE',
				title: detected ? 'هشدار تغییر در سوابق ممیزی' : 'یکپارچگی سوابق ممیزی تأیید شد',
				message: detected
					? `تغییر غیرمجاز احتمالی شناسایی شد: ${modifiedIds.length} رکورد تغییر کرده، ${deletedIds.length} رکورد حذف شده و ${unprotectedIds.length} رکورد فاقد هش حفاظتی است.`
					: 'هیچ تغییر یا حذف غیرمجازی در سوابق ممیزی شناسایی نشد.',
				checkedAt,
				summary: {
					protectedRecords: hashRows.length,
					storedRecords: storedLogs.length,
					fallbackRecords: fallbackLogs.length,
					modifiedRecords: modifiedIds.length,
					deletedRecords: deletedIds.length,
					unprotectedRecords: unprotectedIds.length
				},
				affectedLogIds: affectedIds.slice(0, 100)
			};
			if (detected) {
				const signature = affectedIds.slice().sort().join(':');
				if (signature !== this.lastOverviewAlertSignature) {
					this.lastOverviewAlertSignature = signature;
					LogIntegrityLogger.integrityViolationDetected('audit-log-storage', 'UNAUTHORIZED_MODIFICATION', {
						modifiedRecords: modifiedIds.length,
						deletedRecords: deletedIds.length,
						unprotectedRecords: unprotectedIds.length,
						affectedLogIds: affectedIds.slice(0, 100),
						detectedBy: 'logs_page_integrity_overview'
					});
				}
			} else {
				this.lastOverviewAlertSignature = null;
			}
			this.overviewCache = { value, expiresAt: Date.now() + 30_000 };
			return value;
		} catch {
			return {
				detected: false,
				status: 'UNAVAILABLE',
				severity: 'NONE',
				title: 'وضعیت یکپارچگی در دسترس نیست',
				message: 'در حال حاضر امکان بررسی تغییرات سوابق ممیزی وجود ندارد.',
				checkedAt,
				summary: {
					protectedRecords: 0,
					storedRecords: 0,
					fallbackRecords: 0,
					modifiedRecords: 0,
					deletedRecords: 0,
					unprotectedRecords: 0
				},
				affectedLogIds: []
			};
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
			}
		} catch (error) {
			result.missingHashes++;
			result.invalidLogIds.push(logId);
			LogIntegrityLogger.missingHashDetected(
				logId,
				log,
				error instanceof Error ? error.message : 'Unknown error'
			);
		}
	}

	public async checkLogModification(logId: string): Promise<boolean> {
		try {
			const isValid = await Log.verifyIntegrity(logId);
			await LogIntegrityLogger.logModificationChecked(logId, isValid);

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

			changeStream.on('change', (change: ChangeStreamDocument) => {
				if (!('documentKey' in change)) return;
				this.overviewCache = null;

				const logId = (change.documentKey as { _id: { toString(): string } })._id.toString();
				const extendedChange = change as ChangeStreamDocument & {
					fullDocumentBeforeChange?: Record<string, unknown> | null;
					fullDocument?: Record<string, unknown> | null;
				};

				LogIntegrityLogger.unauthorizedModificationDetected(logId, change.operationType, {
					documentBefore: extendedChange.fullDocumentBeforeChange || null,
					documentAfter: extendedChange.fullDocument || null
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
			await LogIntegrityLogger.serviceStopped();
		} catch (error) {
			Logger.error('Failed to cleanup LogIntegrityService', {
				action: 'LOG_INTEGRITY_SERVICE_CLEANUP_FAILED',
				details: { error: error instanceof Error ? error.message : 'Unknown error' }
			});
		}
	}
}
