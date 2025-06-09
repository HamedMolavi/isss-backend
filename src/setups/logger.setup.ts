import winston from 'winston';
import { MongooseTransport } from '../logger/transports';
import { Logger } from '../logger';
import { SQLite } from '../db/sqlite';
import fs from 'fs';

// Logger setup action types for consistent logging
const LOGGER_SETUP_ACTIONS = {
	INIT: 'logger_init',
	ERROR: 'logger_error',
	CONFIG: 'logger_config'
} as const;

/**
 * Configuration options for the logger setup
 */
interface LoggerSetupOptions {
	sqlitePath?: string;
	logDir?: string;
	serviceName?: string;
	environment?: string;
	consoleLogging?: boolean;
	fileLogging?: boolean;
	mongoLogging?: boolean;
	logLevel?: string;
	maxFileSize?: number;
	maxFiles?: number;
	retentionDays?: number;
	format?: 'json' | 'text';
	includeMetadata?: boolean;
	includeTimestamp?: boolean;
	includeStack?: boolean;
}

/**
 * Default configuration for logger setup
 */
const DEFAULT_OPTIONS: LoggerSetupOptions = {
	sqlitePath: process.cwd() + '/logs-verification.db',
	logDir: process.cwd() + '/logs',
	serviceName: 'isss-backend',
	environment: 'development',
	consoleLogging: true,
	fileLogging: false,
	mongoLogging: true,
	logLevel: 'info',
	maxFileSize: 10 * 1024 * 1024, // 10MB
	maxFiles: 5,
	retentionDays: 30,
	format: 'json',
	includeMetadata: true,
	includeTimestamp: true,
	includeStack: true
};

/**
 * Sets up and configures the application's logging system
 */
export async function setupLogger(options?: LoggerSetupOptions): Promise<Logger> {
	// Merge default options with provided options
	const config = { ...DEFAULT_OPTIONS, ...options };

	// Ensure logs directory exists
	if (config.fileLogging) {
		try {
			if (!fs.existsSync(config.logDir!)) {
				fs.mkdirSync(config.logDir!, { recursive: true });
			}
		} catch (error) {
			console.error(`Failed to create log directory ${config.logDir}:`, error);
			Logger.systemOperation('Failed to create log directory', {
				type: 'logger_setup',
				action: LOGGER_SETUP_ACTIONS.ERROR,
				details: {
					error: error instanceof Error ? error.message : 'Unknown error',
					path: config.logDir
				}
			});
		}
	}

	// Initialize SQLite for hash storage
	try {
		SQLite.init(config.sqlitePath!);
		SQLite.createTable('Hash');

		// Create UserHash table for username integrity checking
		SQLite.createUserHashTable();
	} catch (error) {
		console.error('Failed to initialize SQLite database:', error);
		Logger.systemOperation('Failed to initialize SQLite database', {
			type: 'logger_setup',
			action: LOGGER_SETUP_ACTIONS.ERROR,
			details: {
				error: error instanceof Error ? error.message : 'Unknown error',
				path: config.sqlitePath
			}
		});
		// Continue even if SQLite fails - logs will still work without hashing
	}

	// Create transports array based on configuration
	const transports: winston.transport[] = [];

	// Console transport for development
	if (config.consoleLogging) {
		transports.push(
			new winston.transports.Console({
				level: config.logLevel,
				format: winston.format.combine(
					winston.format.timestamp(),
					winston.format.colorize(),
					winston.format.printf(({ timestamp, level, message, type, action, details, ...meta }) => {
						const baseMessage = `${timestamp} ${level}: ${message}`;
						const context = type ? `[${type}]` : '';
						const actionInfo = action ? `(${action})` : '';
						const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
						const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
						return `${baseMessage}${context}${actionInfo}${detailsStr}${metaStr}`;
					})
				)
			})
		);
	}

	// File transport
	if (config.fileLogging) {
		const fileFormat =
			config.format === 'json'
				? winston.format.combine(winston.format.timestamp(), winston.format.json())
				: winston.format.combine(
						winston.format.timestamp(),
						winston.format.printf(({ timestamp, level, message, type, action, details, ...meta }) => {
							const baseMessage = `${timestamp} ${level}: ${message}`;
							const context = type ? `[${type}]` : '';
							const actionInfo = action ? `(${action})` : '';
							const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
							const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
							return `${baseMessage}${context}${actionInfo}${detailsStr}${metaStr}`;
						})
					);

		transports.push(
			new winston.transports.File({
				level: config.logLevel,
				dirname: config.logDir,
				filename: `${config.serviceName}-combined.log`,
				maxsize: config.maxFileSize,
				maxFiles: config.maxFiles,
				tailable: true,
				zippedArchive: true,
				format: fileFormat
			}),
			new winston.transports.File({
				level: 'error',
				dirname: config.logDir,
				filename: `${config.serviceName}-error.log`,
				maxsize: config.maxFileSize,
				maxFiles: config.maxFiles,
				format: fileFormat
			})
		);
	}

	// MongoDB transport
	if (config.mongoLogging) {
		transports.push(
			new MongooseTransport({
				level: config.logLevel,
				silent: false
			})
		);
	}

	// Create the logger
	const logger = new Logger({
		serviceName: config.serviceName,
		level: config.logLevel,
		exitOnError: false,
		transports,
		exceptionHandlers: [
			...(config.consoleLogging ? [new winston.transports.Console()] : []),
			...(config.fileLogging
				? [
						new winston.transports.File({
							dirname: config.logDir,
							filename: `${config.serviceName}-exceptions.log`,
							format:
								config.format === 'json'
									? winston.format.combine(winston.format.timestamp(), winston.format.json())
									: winston.format.combine(winston.format.timestamp(), winston.format.simple())
						})
					]
				: [])
		],
		rejectionHandlers: [
			...(config.consoleLogging ? [new winston.transports.Console()] : []),
			...(config.fileLogging
				? [
						new winston.transports.File({
							dirname: config.logDir,
							filename: `${config.serviceName}-rejections.log`,
							format:
								config.format === 'json'
									? winston.format.combine(winston.format.timestamp(), winston.format.json())
									: winston.format.combine(winston.format.timestamp(), winston.format.simple())
						})
					]
				: [])
		]
	});

	// Log successful initialization
	Logger.systemOperation('Logging system initialized', {
		type: 'logger_setup',
		action: LOGGER_SETUP_ACTIONS.INIT,
		details: {
			environment: config.environment,
			serviceName: config.serviceName,
			logLevel: config.logLevel,
			transports: {
				console: config.consoleLogging,
				file: config.fileLogging,
				mongo: config.mongoLogging
			},
			config: {
				format: config.format,
				includeMetadata: config.includeMetadata,
				includeTimestamp: config.includeTimestamp,
				includeStack: config.includeStack,
				maxFileSize: config.maxFileSize,
				maxFiles: config.maxFiles,
				retentionDays: config.retentionDays
			}
		}
	});

	return logger;
}
