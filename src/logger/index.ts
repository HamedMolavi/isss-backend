/* eslint-disable @typescript-eslint/no-explicit-any */
import winston, { LoggerOptions, format } from 'winston';
import { MongooseTransport } from './transports';
import { Request } from 'express';

/**
 * Enhanced logger options
 */
interface EnhancedLoggerOptions extends LoggerOptions {
	recreate?: boolean;
	serviceName?: string;
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
	 * Initializes the logger with the specified options
	 */
	static init(opts: EnhancedLoggerOptions = {}): winston.Logger {
		if (!Logger.instance || opts.recreate) {
			Logger.createInstance(opts);
		}

		return Logger.instance;
	}

	/**
	 * Creates the Winston logger instance with default and custom options
	 */
	private static createInstance(opts: EnhancedLoggerOptions): void {
		const serviceName = opts.serviceName || 'app';

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
				new MongooseTransport()
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
	 * Standard logging methods
	 */
	static info(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		return Logger.instance.info(message, meta);
	}

	static error(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		return Logger.instance.error(message, meta);
	}

	static warn(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		return Logger.instance.warn(message, meta);
	}

	static debug(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		return Logger.instance.debug(message, meta);
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

	/**
	 * Specialized logging methods for authentication events
	 */
	static authEvent(userId: string, action: string, success: boolean, details: any = {}): winston.Logger {
		return Logger.info('Authentication event', {
			type: 'auth',
			userId,
			action,
			success,
			details
		});
	}

	/**
	 * Log a data modification event with before/after values
	 */
	static dataChange(
		userId: string,
		model: string,
		action: string,
		recordId: any,
		before: any,
		after: any
	): winston.Logger {
		return Logger.info('Data modification', {
			type: 'data_change',
			userId,
			model,
			action,
			recordId,
			before,
			after
		});
	}

	/**
	 * Log a license-related event
	 */
	static licenseActivity(action: string, license: any, success: boolean, details: any = {}): winston.Logger {
		return Logger.info('License activity', {
			type: 'license',
			action,
			license,
			success,
			details
		});
	}

	/**
	 * Log a system operation event
	 */
	static systemOperation(
		component: string,
		operation: string,
		success: boolean,
		details: any = {}
	): winston.Logger {
		return Logger.info('System operation', {
			type: 'system',
			component,
			operation,
			success,
			details
		});
	}

	/**
	 * Log an API request (can be used in middleware)
	 */
	static request(req: Request, duration?: number): winston.Logger {
		const meta = {
			type: 'request',
			method: req.method,
			url: req.url,
			ip: req.ip,
			userId: req.user?.id,
			duration,
			userAgent: req.headers['user-agent']
		};

		return Logger.info('API request', meta);
	}

	/**
	 * Change MongoDB collection size
	 */
	static changeMongoCollectionSize(cappedSize: number): Promise<any> {
		return MongooseTransport.changeSize(cappedSize);
	}

	/**
	 * Instance method versions of specialized logging methods
	 */
	authEvent(userId: string, action: string, success: boolean, details: any = {}): winston.Logger {
		return Logger.authEvent(userId, action, success, details);
	}

	dataChange(
		userId: string,
		model: string,
		action: string,
		recordId: any,
		before: any,
		after: any
	): winston.Logger {
		return Logger.dataChange(userId, model, action, recordId, before, after);
	}

	licenseActivity(action: string, license: any, success: boolean, details: any = {}): winston.Logger {
		return Logger.licenseActivity(action, license, success, details);
	}

	systemOperation(component: string, operation: string, success: boolean, details: any = {}): winston.Logger {
		return Logger.systemOperation(component, operation, success, details);
	}

	request(req: Request, duration?: number): winston.Logger {
		return Logger.request(req, duration);
	}

	changeMongoCollectionSize(cappedSize: number): Promise<any> {
		return Logger.changeMongoCollectionSize(cappedSize);
	}
}
