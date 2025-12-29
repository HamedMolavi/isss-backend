import { Request, Response } from 'express';
import { LogIntegrityService } from '../services/logIntegrity.service';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { Logger } from '../logger';
import { Log } from '../db/mongo/models/secLog';

/**
 * Get integrity service status - simple overview
 */
export const getIntegrityStatus = async (req: Request, res: Response) => {
	try {
		const service = LogIntegrityService.getInstance();
		const status = service.getServiceStatus();

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'وضعیت سرویس یکپارچگی',
			data: {
				active: status.serviceActive,
				triggerActive: status.triggerActive,
				lastCheck: status.lastVerificationTime,
				alertTopic: status.kafkaTopic
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to get integrity status', {
			action: 'INTEGRITY_STATUS_FAILED',
			error,
			userAgent,
			userId: req.user?._id?.toString(),
			username: req.user?.username
		});
		return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR, msg: 'خطا در دریافت وضعیت' });
	}
};

/**
 * Verify integrity of recent logs - batch check
 */
export const verifyRecentLogsIntegrity = async (req: Request, res: Response) => {
	try {
		const count = Math.min(Math.max(parseInt(req.query.count as string) || 100, 1), 10000);

		const service = LogIntegrityService.getInstance();
		const result = await service.verifyRecentLogsIntegrity(count);

		const successRate =
			result.totalChecked > 0 ? Math.round((result.validLogs / result.totalChecked) * 100) : 100;

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'بررسی یکپارچگی لاگ‌ها',
			data: {
				summary: {
					total: result.totalChecked,
					valid: result.validLogs,
					invalid: result.invalidLogs,
					missing: result.missingHashes,
					successRate: `${successRate}%`,
					duration: `${result.verificationTime}ms`
				},
				status: result.invalidLogs === 0 ? 'OK' : 'WARNING',
				invalidLogIds: result.invalidLogIds.slice(0, 10) // Show first 10 only
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to verify logs', {
			action: 'VERIFY_LOGS_FAILED',
			error,
			userAgent,
			userId: req.user?._id?.toString(),
			username: req.user?.username
		});
		return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR, msg: 'خطا در بررسی یکپارچگی' });
	}
};

/**
 * Check single log integrity
 */
export const checkLogModification = async (req: Request, res: Response) => {
	try {
		const { logId } = req.params;
		if (!logId) {
			return ApiRes(res, { status: HttpStatus.BAD_REQUEST, msg: 'شناسه لاگ الزامی است' });
		}

		const log = await Log.findById(logId).lean();
		if (!log) {
			return ApiRes(res, { status: HttpStatus.NOT_FOUND, msg: 'لاگ یافت نشد' });
		}

		const isIntact = await Log.verifyIntegrity(logId);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: isIntact ? 'لاگ سالم است' : 'لاگ دستکاری شده است',
			data: {
				logId,
				status: isIntact ? 'INTACT' : 'TAMPERED',
				isIntact,
				log: {
					level: log.level,
					action: log.action,
					message: log.message.substring(0, 100),
					timestamp: log.timestamp
				}
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to check log', {
			action: 'CHECK_LOG_FAILED',
			error,
			userAgent,
			userId: req.user?._id?.toString(),
			username: req.user?.username
		});
		return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR, msg: 'خطا در بررسی لاگ' });
	}
};

/**
 * Get tampering report for a log - shows system reaction
 */
export const getTamperingReport = async (req: Request, res: Response) => {
	try {
		const { logId } = req.params;
		if (!logId) {
			return ApiRes(res, { status: HttpStatus.BAD_REQUEST, msg: 'شناسه لاگ الزامی است' });
		}

		const log = await Log.findById(logId).lean();
		if (!log) {
			return ApiRes(res, { status: HttpStatus.NOT_FOUND, msg: 'لاگ یافت نشد' });
		}

		const isIntact = await Log.verifyIntegrity(logId);
		const service = LogIntegrityService.getInstance();
		const serviceStatus = service.getServiceStatus();

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: isIntact ? 'گزارش یکپارچگی - سالم' : 'گزارش یکپارچگی - دستکاری شده',
			data: {
				logId,
				integrity: {
					status: isIntact ? 'INTACT' : 'TAMPERED',
					method: 'SHA-256',
					checkedAt: new Date().toISOString()
				},
				log: {
					level: log.level,
					action: log.action,
					message: log.message,
					timestamp: log.timestamp
				},
				reaction: isIntact
					? {
							severity: 'INFO',
							action: 'هیچ اقدامی نیاز نیست',
							alertSent: false
						}
					: {
							severity: 'CRITICAL',
							action: 'هشدار ارسال شد',
							alertSent: serviceStatus.serviceActive,
							alertChannel: 'Kafka',
							recommendations: [
								'بررسی منبع تغییرات',
								'بررسی لاگ‌های دسترسی پایگاه داده',
								'بازیابی از نسخه پشتیبان در صورت نیاز'
							]
						}
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to generate report', {
			action: 'REPORT_FAILED',
			error,
			userAgent,
			userId: req.user?._id?.toString(),
			username: req.user?.username
		});
		return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR, msg: 'خطا در تولید گزارش' });
	}
};

/**
 * Restore a tampered log
 */
export const restoreTamperedLog = async (req: Request, res: Response) => {
	try {
		const { logId } = req.params;
		const { field, originalValue } = req.body;

		if (!logId) {
			return ApiRes(res, { status: HttpStatus.BAD_REQUEST, msg: 'شناسه لاگ الزامی است' });
		}

		const allowedFields = ['message', 'level', 'action'];
		if (!field || !allowedFields.includes(field)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: `فیلد باید یکی از: ${allowedFields.join(', ')}`
			});
		}

		if (originalValue === undefined) {
			return ApiRes(res, { status: HttpStatus.BAD_REQUEST, msg: 'مقدار اصلی الزامی است' });
		}

		const log = await Log.findById(logId);
		if (!log) {
			return ApiRes(res, { status: HttpStatus.NOT_FOUND, msg: 'لاگ یافت نشد' });
		}

		const beforeRestore = await Log.verifyIntegrity(logId);
		(log as unknown as Record<string, unknown>)[field] = originalValue;
		await log.save();
		const afterRestore = await Log.verifyIntegrity(logId);

		Logger.systemOperation('Log restored', { action: 'LOG_RESTORED', logId, field });

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: afterRestore ? 'لاگ با موفقیت بازیابی شد' : 'بازیابی ناموفق',
			data: {
				logId,
				field,
				beforeRestore: beforeRestore ? 'INTACT' : 'TAMPERED',
				afterRestore: afterRestore ? 'INTACT' : 'TAMPERED',
				success: afterRestore
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to restore log', {
			action: 'RESTORE_FAILED',
			error,
			userAgent,
			userId: req.user?._id?.toString(),
			username: req.user?.username
		});
		return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR, msg: 'خطا در بازیابی لاگ' });
	}
};
