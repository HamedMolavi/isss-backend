import { Request, Response, NextFunction } from 'express';
import { SecurityConfig } from '../db/mongo/models/securityConfig';
import { ISecurityConfig } from '../types/interfaces/securityConfig.interface';
import { SecurityLogger } from '../logger/security.logger';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';

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
				passwordRequirements: [
					{ re: '[0-9]', label: 'Includes number' },
					{ re: '[a-z]', label: 'Includes lowercase letter' },
					{ re: '[A-Z]', label: 'Includes uppercase letter' },
					{ re: "[$&+,:;=?@#|'<>.^*()%!-]", label: 'Includes special symbol' }
				],
				logBackup: {
					checkIntervalHours: 24,
					checkIntervalMs: 24 * 60 * 60 * 1000,
					ttlDays: 60,
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

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ maxConcurrentSessions: maxConcurrentSessions },
			{ new: true, upsert: true }
		);

		SecurityLogger.maxSessionsConfigUpdated(req, maxConcurrentSessions);
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

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ passwordRequirements },
			{ new: true, upsert: true }
		);

		SecurityLogger.passwordRequirementsUpdated(req, passwordRequirements);
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

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ $set: { loginRateLimit: updateData } },
			{ new: true, upsert: true }
		);

		SecurityLogger.rateLimitConfigUpdated(req, updateData);
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
 * Update log backup settings
 */
export const updateLogBackupSettings = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { checkIntervalHours, checkIntervalMs, ttlDays, defaultConfig } = req.body;

		const updateData: Partial<ISecurityConfig['logBackup']> = {};

		if (checkIntervalHours !== undefined) updateData.checkIntervalHours = checkIntervalHours;
		if (checkIntervalMs !== undefined) updateData.checkIntervalMs = checkIntervalMs;
		if (ttlDays !== undefined) updateData.ttlDays = ttlDays;
		if (defaultConfig !== undefined) updateData.defaultConfig = defaultConfig;

		if (Object.keys(updateData).length === 0) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'No valid log backup fields provided'
			});
		}

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ $set: { logBackup: updateData } },
			{ new: true, upsert: true }
		);

		SecurityLogger.logBackupConfigUpdated(req, updateData);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Log backup settings updated successfully',
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

		const config = await SecurityConfig.findOneAndUpdate(
			{},
			{ $set: { 'session.timeout': timeout } },
			{ new: true, upsert: true }
		);

		SecurityLogger.sessionConfigUpdated(req, timeout);
		return ApiRes(res, {
			status: HttpStatus.OK,
			msg: 'Session settings updated successfully',
			data: config
		});
	} catch (error) {
		next(error);
	}
};
