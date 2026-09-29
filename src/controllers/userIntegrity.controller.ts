import { Request, Response } from 'express';
import { UserIntegrityService } from '../services/userIntegrity.service';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { Logger } from '../logger';
import User from '../db/mongo/models/user';

/**
 * Get user integrity service status
 */
export const getUserIntegrityStatus = async (req: Request, res: Response) => {
	try {
		const service = UserIntegrityService.getInstance();
		const status = service.getServiceStatus();

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'وضعیت سرویس تشخیص دستکاری حساب‌های کاربری',
			data: {
				active: status.serviceActive,
				lastCheck: status.lastVerificationTime,
				monitoringActive: status.monitoringActive
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to get user integrity status', {
			action: 'USER_INTEGRITY_STATUS_FAILED',
			error,
			userAgent,
			userId: req.user?._id?.toString(),
			username: req.user?.username
		});
		return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR, msg: 'خطا در دریافت وضعیت' });
	}
};

/**
 * Verify integrity of complete protected user records - batch check
 */
export const verifyUsernamesIntegrity = async (req: Request, res: Response) => {
	try {
		const count = req.query.count
			? Math.min(Math.max(parseInt(req.query.count as string), 1), 10000)
			: undefined;

		const service = UserIntegrityService.getInstance();
		const result = await service.verifyUsernamesIntegrity(count);

		const successRate =
			result.totalChecked > 0 ? Math.round((result.validUsers / result.totalChecked) * 100) : 100;

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'بررسی یکپارچگی حساب‌های کاربری',
			data: {
				summary: {
					total: result.totalChecked,
					valid: result.validUsers,
					invalid: result.invalidUsers,
					missing: result.missingHashes,
					deleted: result.deletedUsers,
					successRate: `${successRate}%`,
					duration: `${result.verificationTime}ms`
				},
				status:
					result.invalidUsers === 0 && result.missingHashes === 0 && result.deletedUsers === 0
						? 'OK'
						: 'WARNING',
				invalidUserIds: result.invalidUserIds.slice(0, 10),
				invalidUsernames: result.invalidUsernames.slice(0, 10)
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to verify usernames', {
			action: 'VERIFY_USERNAMES_FAILED',
			error,
			userAgent,
			userId: req.user?._id?.toString(),
			username: req.user?.username
		});
		return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR, msg: 'خطا در بررسی یکپارچگی' });
	}
};

/**
 * Check single user integrity
 */
export const checkUsernameModification = async (req: Request, res: Response) => {
	try {
		const { userId } = req.params;
		if (!userId) {
			return ApiRes(res, { status: HttpStatus.BAD_REQUEST, msg: 'شناسه کاربر الزامی است' });
		}

		const user = await User.findById(userId).lean();
		if (!user) {
			return ApiRes(res, { status: HttpStatus.NOT_FOUND, msg: 'کاربر یافت نشد' });
		}

		const isIntact = await User.verifyIntegrity(userId);

		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: isIntact ? 'رکورد حساب کاربری سالم است' : 'رکورد حساب کاربری دستکاری شده است',
			data: {
				userId,
				status: isIntact ? 'INTACT' : 'TAMPERED',
				isIntact,
				user: {
					username: user.username,
					role: user.role,
					createdAt: user.created_date
				}
			}
		});
	} catch (error) {
		const userAgent = req.get('User-Agent') || req.headers['user-agent'] || 'unknown';
		Logger.error('Failed to check username', {
			action: 'CHECK_USERNAME_FAILED',
			error,
			userAgent,
			userId: req.user?._id?.toString(),
			username: req.user?.username
		});
		return ApiRes(res, { status: HttpStatus.INTERNAL_SERVER_ERROR, msg: 'خطا در بررسی کاربر' });
	}
};
