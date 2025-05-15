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
	static authEvent(
		userId: string,
		action: string,
		success: boolean,
		details: any = {},
		req: Request
	): winston.Logger {
		const user_agent = req ? get_user_agent(req) : { ip: 'unknown', user_agent: 'unknown' };

		const meta = {
			type: 'auth',
			userId,
			username: req.user.username,
			action,
			success,
			details,
			ip: user_agent.ip,
			userAgent: user_agent.user_agent,
			timestamp: new Date()
		};
		return Logger.info('Authentication event', meta);
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
			userId,
			model,
			action,
			recordId,
			before,
			after,
			ip: user_agent.ip,
			userAgent: user_agent.user_agent
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
			userAgent: user_agent.user_agent
		});
	}

	static systemOperation(
		component: string,
		operation: string,
		success: boolean,
		details: any = {},
		req?: Request
	): winston.Logger {
		const user_agent = req ? get_user_agent(req) : { ip: 'unknown', user_agent: 'unknown' };
		return Logger.info('System operation', {
			type: 'system',
			component,
			operation,
			success,
			details,
			userId: req?.user._id.toString(),
			ip: user_agent.ip,
			userAgent: user_agent.user_agent
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
			method: req.method,
			url: req.originalUrl,
			ip: user_agent.ip,
			userId: req.user._id.toString(),
			username: req.user.username,
			duration,
			success,
			details,
			userAgent: user_agent.user_agent,
			headers: req.headers,
			timestamp: new Date()
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

	systemOperation(
		component: string,
		operation: string,
		success: boolean,
		details: any = {},
		req?: Request
	): winston.Logger {
		return Logger.systemOperation(component, operation, success, details, req);
	}

	request(req: Request, duration?: number): winston.Logger {
		return Logger.request(req, duration);
	}
}
