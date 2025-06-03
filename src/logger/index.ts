/* eslint-disable @typescript-eslint/no-explicit-any */
import winston, { LoggerOptions, format } from 'winston';
import { MongooseTransport } from './transports';
import { Request } from 'express';
import { get_user_agent } from '../tools/user_agent.utility';
import { generateActionString } from '../tools/url.utility';

/**
 * Enhanced logger options
 */
interface EnhancedLoggerOptions extends LoggerOptions {
	recreate?: boolean;
	serviceName?: string;
	disableMetadataFilter?: boolean;
}

/**
 * Metadata interface for logging
 */
interface LogMetadata {
	[key: string]: unknown;
}
/**
 * Logger singleton that provides specialized logging methods
 */
export class Logger {
	private static instance: winston.Logger;
	private static initialized: boolean = false;

	constructor(opts: EnhancedLoggerOptions = {}) {
		if (!Logger.instance || opts.recreate) {
			Logger.createInstance(opts);
		}
	}

	// Add getter to access instance
	public static getInstance(): winston.Logger {
		if (!Logger.instance) {
			Logger.createInstance({});
		}
		return Logger.instance;
	}

	/**
	 * Creates the Winston logger instance with default and custom options
	 */
	private static createInstance(opts: EnhancedLoggerOptions): void {
		const serviceName = opts.serviceName || 'isss-backend';

		// Default format that includes timestamps and service name
		const defaultFormat = format.combine(
			format.timestamp(),
			format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
			format.json()
		);

		// Create the logger with default options that can be overridden
		Logger.instance = winston.createLogger({
			level: process.env.LOG_LEVEL || 'info',
			format: defaultFormat,
			defaultMeta: { service: serviceName },
			transports: [
				// Default to console in development
				new winston.transports.Console({
					format: format.combine(format.colorize(), format.simple())
				}),
				// Use MongooseTransport by default
				new MongooseTransport({ disableFilter: opts.disableMetadataFilter })
			],
			...opts
		});

		Logger.initialized = true;
	}

	/**
	 * Ensures the logger is initialized before use
	 */
	private static ensureInitialized(): void {
		if (!Logger.initialized) {
			Logger.createInstance({});
		}
	}

	/**
	 * Formats a log message consistently
	 */
	private static formatMessage(message: string, meta?: LogMetadata): { action: string; message: string } {
		// Extract action from metadata if available
		const action = (meta?.action || meta?.type || 'system') as string;

		// Clean message format
		let cleanMessage = message;
		if (message.includes(' - ')) {
			cleanMessage = message.split(' - ')[1];
		}

		return {
			action,
			message: cleanMessage
		};
	}

	/**
	 * Standard logging methods
	 */
	static info(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		const { action, message: cleanMessage } = Logger.formatMessage(message, meta);
		return Logger.instance.info(cleanMessage, { ...meta, action });
	}

	static error(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		const { action, message: cleanMessage } = Logger.formatMessage(message, meta);
		return Logger.instance.error(cleanMessage, { ...meta, action });
	}

	static warn(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		const { action, message: cleanMessage } = Logger.formatMessage(message, meta);
		return Logger.instance.warn(cleanMessage, { ...meta, action });
	}

	static debug(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		const { action, message: cleanMessage } = Logger.formatMessage(message, meta);
		return Logger.instance.debug(cleanMessage, { ...meta, action });
	}

	/**
	 * Instance methods that delegate to the static methods
	 */
	info(message: string, meta?: LogMetadata): winston.Logger {
		return Logger.info(message, meta);
	}

	error(message: string, meta?: LogMetadata): winston.Logger {
		return Logger.error(message, meta);
	}

	warn(message: string, meta?: LogMetadata): winston.Logger {
		return Logger.warn(message, meta);
	}

	debug(message: string, meta?: LogMetadata): winston.Logger {
		return Logger.debug(message, meta);
	}

	static dataChange(
		userId: string,
		model: string,
		action: string,
		recordId: any,
		before: any,
		after: any,
		req?: Request
	): winston.Logger {
		const user_agent = req ? get_user_agent(req) : { ip: 'unknown', user_agent: 'unknown' };
		return Logger.info('Data modification', {
			type: 'data_change',
			action,
			userId,
			model,
			recordId,
			before,
			after,
			ip: user_agent.ip,
			userAgent: user_agent.user_agent,
			timestamp: new Date(),
			_disableFilter: true // Important data change event
		});
	}

	static licenseActivity(
		action: string,
		license: any,
		success: boolean,
		details: any = {},
		req?: Request
	): winston.Logger {
		const user_agent = req ? get_user_agent(req) : { ip: 'unknown', user_agent: 'unknown' };
		return Logger.info('License activity', {
			type: 'license',
			action,
			license,
			success,
			details,
			userId: req?.user._id.toString(),
			ip: user_agent.ip,
			userAgent: user_agent.user_agent,
			timestamp: new Date(),
			_disableFilter: true // Important license event
		});
	}

	static systemOperation(message: string, meta?: LogMetadata, req?: Request): winston.Logger {
		Logger.ensureInitialized();
		const user_agent = req ? get_user_agent(req) : { ip: 'unknown', user_agent: 'unknown' };

		return Logger.instance.info(message, {
			type: 'system',
			action: meta?.action || 'system_operation',
			_disableFilter: true, // System operations should always be logged
			ip: user_agent.ip,
			userAgent: user_agent.user_agent,
			userId: req?.user?._id?.toString(),
			username: req?.user?.username,
			timestamp: new Date(),
			...meta
		});
	}

	/**
	 * Log an API request (can be used in middleware)
	 */
	static request(
		req: Request,
		duration?: number,
		success?: boolean,
		errorResponse?: unknown,
		requestBody?: unknown
	): winston.Logger {
		const user_agent = get_user_agent(req);
		const statusCode = req.res?.statusCode || 0;
		const requestSuccess = success !== undefined ? success : statusCode >= 200 && statusCode < 400;

		const details = {
			statusCode,
			...(req.method === 'POST' && { operation: 'create' }),
			...(req.method === 'PUT' && { operation: 'update' }),
			...(req.method === 'DELETE' && { operation: 'delete' }),
			...(req.method === 'GET' && { operation: 'read' }),
			...(req.method === 'PATCH' && { operation: 'partial_update' }),
			// Add error-specific details when request failed
			...(!requestSuccess && errorResponse ? { errorResponse } : {}),
			...(!requestSuccess && requestBody ? { requestBody } : {})
		};

		const action = generateActionString(req);

		const meta = {
			type: 'request',
			action,
			method: req.method,
			url: req.originalUrl,
			ip: user_agent.ip,
			userId: req?.user?._id.toString() ?? 'unknown',
			username: req?.user?.username ?? 'unknown',
			duration,
			success: requestSuccess,
			details,
			userAgent: user_agent.user_agent,
			headers: req.headers,
			timestamp: new Date(),
			_disableFilter: true // All requests should be logged
		};

		// Use Logger.error for failed requests, Logger.info for successful ones
		return requestSuccess ? Logger.info(action, meta) : Logger.error(action, meta);
	}

	/**
	 * Instance method versions of specialized logging methods
	 */

	dataChange(
		userId: string,
		model: string,
		action: string,
		recordId: any,
		before: any,
		after: any,
		req?: Request
	): winston.Logger {
		return Logger.dataChange(userId, model, action, recordId, before, after, req);
	}

	licenseActivity(
		action: string,
		license: any,
		success: boolean,
		details: any = {},
		req?: Request
	): winston.Logger {
		return Logger.licenseActivity(action, license, success, details, req);
	}

	systemOperation(message: string, meta?: LogMetadata): winston.Logger {
		return Logger.systemOperation(message, meta);
	}

	request(
		req: Request,
		duration?: number,
		success?: boolean,
		errorResponse?: unknown,
		requestBody?: unknown
	): winston.Logger {
		return Logger.request(req, duration, success, errorResponse, requestBody);
	}
}

// Export service loggers
export { BackupLogger, BackupEventType } from './backup.logger';
export { BackupSchedulerLogger, BackupSchedulerEventType } from './backupScheduler.logger';
export { LogIntegrityLogger, LogIntegrityEventType } from './logIntegrity.logger';
