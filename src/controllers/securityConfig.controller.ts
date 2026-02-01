import { Request, Response, NextFunction } from 'express';
import { SecurityConfig } from '../db/mongo/models/securityConfig';
import { ISecurityConfig } from '../types/interfaces/securityConfig.interface';
import { SecurityLogger } from '../logger/security.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { getSessionManager } from '../services/session.service';
import { refreshSecurityConfig } from '../config/security.config';

/**
 * Hash algorithm information - fixed to SHA-256 as per ST document
 */
export const HASH_ALGORITHM_INFO = {
	algorithm: 'SHA-256',
	digestSizeBits: 256,
	description: 'Secure Hash Algorithm 256-bit'
} as const;

/**
 * Get current security configuration
 */
export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
	try {
		let config = await SecurityConfig.findOne();

		if (!config) {
			// Create default config if none exists
			config = new SecurityConfig({
				maxConcurrentSessions: 5,
				passwordMinLength: 8,
				passwordRequirements: [
					{ re: '.{8,}', label: 'At least 8 characters' },
					{ re: '[0-9]', label: 'Includes number' },
					{ re: '[a-z]', label: 'Includes lowercase letter' },
					{ re: '[A-Z]', label: 'Includes uppercase letter' },
					{ re: "[$&+,:;=?@#|'<>.^*()%!-]", label: 'Includes special symbol' }
				],
				logBackup: {
					checkIntervalHours: 24,
					checkIntervalMs: 24 * 60 * 60 * 1000,
					ttlDays: 60,
					backupIntervalDays: 30,
					maxSizeBytes: 1024 * 1024 * 1024,
					maxLogCount: 1000000,
					warningThreshold: 0.8,
					autoBackup: true,
					autoCleanup: false,
					defaultConfig: {
						ttlDays: 60,
						isAutoBackup: true
					}
				},
				loginRateLimit: {
					maxAttempts: 5,
					blockDurationMinutes: 30,
					windowMinutes: 15,
					historyRetentionDays: 7
				},
				session: {
					timeout: 30 * 60 * 1000
				}
			});
			await config.save();
		}

		SecurityLogger.securityConfigAccessed(req);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Security configuration retrieved successfully',
			data: config
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Update max concurrent sessions
 */
export const updateMaxConcurrentSessions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { maxConcurrentSessions } = req.body;

		if (!maxConcurrentSessions || maxConcurrentSessions < 1) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Max concurrent sessions must be at least 1'
			});
		}

		const beforeConfig = await SecurityConfig.findOne({}, { maxConcurrentSessions: 1 });

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ maxConcurrentSessions: maxConcurrentSessions },
			{ new: true, upsert: true }
		);

		SecurityLogger.securityConfigUpdated(
			req,
			'maxConcurrentSessions',
			beforeConfig ? { maxConcurrentSessions: beforeConfig.maxConcurrentSessions } : undefined,
			config ? { maxConcurrentSessions: config.maxConcurrentSessions } : undefined
		);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Max concurrent sessions updated successfully',
			data: config
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Update password requirements
 */
export const updatePasswordRequirements = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { passwordRequirements } = req.body;

		if (!Array.isArray(passwordRequirements)) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Password requirements must be an array'
			});
		}

		// Validate regex patterns
		for (const requirement of passwordRequirements) {
			if (!requirement.re || !requirement.label) {
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: 'Each password requirement must have "re" and "label" fields'
				});
			}

			try {
				new RegExp(requirement.re);
			} catch {
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: `Invalid regex pattern: ${requirement.re}`
				});
			}
		}

		const beforeConfig = await SecurityConfig.findOne({}, { passwordRequirements: 1 });

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ passwordRequirements },
			{ new: true, upsert: true }
		);

		// Refresh the in-memory security config
		await refreshSecurityConfig();

		SecurityLogger.securityConfigUpdated(
			req,
			'passwordRequirements',
			beforeConfig ? { passwordRequirements: beforeConfig.passwordRequirements } : undefined,
			config ? { passwordRequirements: config.passwordRequirements } : undefined
		);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Password requirements updated successfully',
			data: config
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Update login rate limit settings
 */
export const updateLoginRateLimit = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { maxAttempts, blockDurationMinutes, windowMinutes, historyRetentionDays } = req.body;

		const updateData: Partial<ISecurityConfig['loginRateLimit']> = {};

		if (maxAttempts !== undefined) updateData.maxAttempts = maxAttempts;
		if (blockDurationMinutes !== undefined) updateData.blockDurationMinutes = blockDurationMinutes;
		if (windowMinutes !== undefined) updateData.windowMinutes = windowMinutes;
		if (historyRetentionDays !== undefined) updateData.historyRetentionDays = historyRetentionDays;

		if (Object.keys(updateData).length === 0) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'No valid login rate limit fields provided'
			});
		}

		const beforeConfig = await SecurityConfig.findOne({}, { loginRateLimit: 1 });

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ $set: { loginRateLimit: updateData } },
			{ new: true, upsert: true }
		);

		SecurityLogger.securityConfigUpdated(
			req,
			'loginRateLimit',
			beforeConfig ? { loginRateLimit: beforeConfig.loginRateLimit } : undefined,
			config ? { loginRateLimit: config.loginRateLimit } : undefined
		);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Login rate limit settings updated successfully',
			data: config
		});
	} catch (error) {
		next(error);
	}
};

/**
 * Update session settings
 */
export const updateSessionSettings = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { timeout } = req.body;

		if (timeout === undefined) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Session timeout is required'
			});
		}

		if (timeout < 1000) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Session timeout must be at least 1000ms (1 second)'
			});
		}

		const beforeConfig = await SecurityConfig.findOne({}, { 'session.timeout': 1 });

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ $set: { 'session.timeout': timeout } },
			{ new: true, upsert: true }
		);

		// Refresh the in-memory security config so new timeout takes effect immediately
		await refreshSecurityConfig();

		// Update TTL for all active sessions to apply new timeout immediately
		const sessionManager = await getSessionManager();
		const { updated, failed } = await sessionManager.updateAllSessionsTTL(timeout);

		SecurityLogger.securityConfigUpdated(
			req,
			'session.timeout',
			beforeConfig ? { timeout: beforeConfig.session?.timeout } : undefined,
			config ? { timeout: config.session?.timeout } : undefined
		);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Session settings updated successfully',
			data: {
				...config?.toObject(),
				activeSessionsUpdated: updated,
				activeSessionsFailed: failed
			}
		});
	} catch (error) {
		next(error);
	}
};
