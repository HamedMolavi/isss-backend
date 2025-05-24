/* eslint-disable @typescript-eslint/no-explicit-any */
import winston, { LoggerOptions, format } from 'winston';
import { MongooseTransport } from './transports';
import { Request } from 'express';
import { get_user_agent } from '../tools/user_agent.utility';

/**
 * Generates a descriptive action string based on URL path structure
 * @param req Express request object
 * @param statusCode HTTP response status code
 * @returns A descriptive action string for logging
 */
function generateActionString(req: Request): string {
	// Get the operation based on HTTP method
	const operation =
		req.method === 'POST'
			? 'create'
			: req.method === 'PUT'
				? 'update'
				: req.method === 'DELETE'
					? 'delete'
					: req.method === 'GET'
						? 'read'
						: req.method === 'PATCH'
							? 'partial_update'
							: 'execute';

	// Extract path without query parameters
	const url = req.originalUrl || req.url;
	const path = url.split('?')[0];

	// Split path into segments and remove empty ones
	let segments = path.split('/').filter(Boolean);

	// Remove API version prefix if present (api/v1, api/v2, etc.)
	if (segments.length >= 2 && segments[0] === 'api' && segments[1].startsWith('v')) {
		segments = segments.slice(2);
	}

	// Handle empty path after removing prefix
	if (segments.length === 0) {
		return `${operation}_root`;
	}

	// Extract resource and sub-resource
	const resource = segments[0];

	// Handle auth endpoints with special format
	if (resource === 'auth' && segments.length > 1) {
		return `${resource}_${segments[1]}`;
	}

	// Singularize resource name for better action naming - general rule
	let singularResource = resource;
	if (resource.endsWith('s')) {
		singularResource = resource.endsWith('ies')
			? resource.slice(0, -3) + 'y' // Handles plurals like "categories" → "category"
			: resource.slice(0, -1); // Handles regular plurals like "users" → "user"
	}

	// Build the action string
	let action = '';

	// Add operation prefix except for auth endpoints
	if (resource !== 'auth') {
		action += `${operation}_`;
	}

	// Add resource name
	action += singularResource;

	// Add sub-resources if present
	if (segments.length > 1 && !isLikelyId(segments[1])) {
		action += `_${segments[1]}`;

		// Add additional sub-resources if present
		if (segments.length > 2 && !isLikelyId(segments[2])) {
			action += `_${segments[2]}`;
		}
	}

	return action;
}

/**
 * Checks if a path segment is likely an ID rather than a resource name
 */
function isLikelyId(segment: string): boolean {
	return (
		// UUID pattern
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
		// MongoDB ObjectId pattern
		/^[0-9a-f]{24}$/i.test(segment) ||
		// Numeric ID
		/^\d+$/.test(segment)
	);
}
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
	private static lastLog: { message: string; meta: any; timestamp: number } | null = null;
	private static readonly DEDUP_WINDOW_MS = 1000; // 1 second window for deduplication

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

		// If message already contains action prefix, remove it
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
	 * Checks if a log is a duplicate within the deduplication window
	 */
	private static isDuplicate(message: string, meta?: LogMetadata): boolean {
		if (!Logger.lastLog) return false;

		const now = Date.now();
		if (now - Logger.lastLog.timestamp > Logger.DEDUP_WINDOW_MS) {
			return false;
		}

		// Compare message and metadata
		return Logger.lastLog.message === message && JSON.stringify(Logger.lastLog.meta) === JSON.stringify(meta);
	}

	/**
	 * Standard logging methods with deduplication
	 */
	static info(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		const { action, message: cleanMessage } = Logger.formatMessage(message, meta);

		if (Logger.isDuplicate(cleanMessage, meta)) {
			return Logger.instance;
		}

		Logger.lastLog = {
			message: cleanMessage,
			meta,
			timestamp: Date.now()
		};

		return Logger.instance.info(cleanMessage, { ...meta, action });
	}

	static error(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		const { action, message: cleanMessage } = Logger.formatMessage(message, meta);

		if (Logger.isDuplicate(cleanMessage, meta)) {
			return Logger.instance;
		}

		Logger.lastLog = {
			message: cleanMessage,
			meta,
			timestamp: Date.now()
		};

		return Logger.instance.error(cleanMessage, { ...meta, action });
	}

	static warn(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		const { action, message: cleanMessage } = Logger.formatMessage(message, meta);

		if (Logger.isDuplicate(cleanMessage, meta)) {
			return Logger.instance;
		}

		Logger.lastLog = {
			message: cleanMessage,
			meta,
			timestamp: Date.now()
		};

		return Logger.instance.warn(cleanMessage, { ...meta, action });
	}

	static debug(message: string, meta?: LogMetadata): winston.Logger {
		Logger.ensureInitialized();
		const { action, message: cleanMessage } = Logger.formatMessage(message, meta);

		if (Logger.isDuplicate(cleanMessage, meta)) {
			return Logger.instance;
		}

		Logger.lastLog = {
			message: cleanMessage,
			meta,
			timestamp: Date.now()
		};

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

	/**
	 * Specialized logging methods for authentication events
	 */
	static authEvent(
		userId: string,
		action: string,
		success: boolean,
		details: any = {},
		req: Request
	): winston.Logger {
		const user_agent = req ? get_user_agent(req) : { ip: 'unknown', user_agent: 'unknown' };
		console.log(req.user);
		const meta = {
			type: 'auth',
			action,
			userId,
			username: req?.user?.username || 'unknown',
			success,
			details,
			ip: user_agent.ip,
			userAgent: user_agent.user_agent,
			timestamp: new Date(),
			_disableFilter: true // Important security event
		};
		return Logger.info(`Authentication ${success ? 'succeeded' : 'failed'}`, meta);
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
	static request(req: Request, duration?: number): winston.Logger {
		const user_agent = get_user_agent(req);
		const statusCode = req.res?.statusCode || 0;
		const success = statusCode >= 200 && statusCode < 400;

		const details = {
			statusCode,
			...(req.method === 'POST' && { operation: 'create' }),
			...(req.method === 'PUT' && { operation: 'update' }),
			...(req.method === 'DELETE' && { operation: 'delete' }),
			...(req.method === 'GET' && { operation: 'read' }),
			...(req.method === 'PATCH' && { operation: 'partial_update' })
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
			success,
			details,
			userAgent: user_agent.user_agent,
			headers: req.headers,
			timestamp: new Date(),
			_disableFilter: true // All requests should be logged
		};

		return Logger.info(action, meta);
	}

	/**
	 * Instance method versions of specialized logging methods
	 */
	authEvent(
		userId: string,
		action: string,
		success: boolean,
		details: any = {},
		req: Request
	): winston.Logger {
		return Logger.authEvent(userId, action, success, details, req);
	}

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

	request(req: Request, duration?: number): winston.Logger {
		return Logger.request(req, duration);
	}
}
