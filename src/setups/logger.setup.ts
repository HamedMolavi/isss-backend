import winston from 'winston';
import { MongooseTransport } from '../logger/transports';
import { Logger } from '../logger';
import { SQLite } from '../db/sqlite';
import fs from 'fs';

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
}

/**
 * Sets up and configures the application's logging system
 */
export async function setupLogger(options?: LoggerSetupOptions): Promise<Logger> {
	// Default options
	const {
		sqlitePath = process.cwd() + '/logs-verification.db',
		logDir = process.cwd() + '/logs',
		serviceName = 'isss-backend',
		environment = 'development',
		consoleLogging = true,
		fileLogging = false,
		mongoLogging = true,
		logLevel = 'info',
		maxFileSize = parseInt('10485760'), // 10MB default
		maxFiles = parseInt('5')
	} = options || {};

	// Ensure logs directory exists
	if (fileLogging) {
		try {
			if (!fs.existsSync(logDir)) {
				fs.mkdirSync(logDir, { recursive: true });
			}
		} catch (error) {
			console.error(`Failed to create log directory ${logDir}:`, error);
		}
	}

	// Initialize SQLite for hash storage
	try {
		SQLite.init(sqlitePath);
		SQLite.createTable('Hash');
	} catch (error) {
		console.error('Failed to initialize SQLite database:', error);
		// Continue even if SQLite fails - logs will still work without hashing
	}

	// Create transports array based on configuration
	const transports: winston.transport[] = [];

	// Console transport for development
	if (consoleLogging) {
		transports.push(
			new winston.transports.Console({
				level: logLevel,
				format: winston.format.combine(
					winston.format.timestamp(),
					winston.format.colorize(),
					winston.format.printf(({ timestamp, level, message, ...meta }) => {
						return `${timestamp} ${level}: ${message}${
							Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
						}`;
					})
				)
			})
		);
	}

	// File transport
	if (fileLogging) {
		transports.push(
			new winston.transports.File({
				level: logLevel,
				dirname: logDir,
				filename: `${serviceName}-combined.log`,
				maxsize: maxFileSize,
				maxFiles,
				tailable: true,
				zippedArchive: true,
				format: winston.format.combine(winston.format.timestamp(), winston.format.json())
			}),
			new winston.transports.File({
				level: 'error',
				dirname: logDir,
				filename: `${serviceName}-error.log`,
				maxsize: maxFileSize,
				maxFiles,
				format: winston.format.combine(winston.format.timestamp(), winston.format.json())
			})
		);
	}

	// MongoDB transport
	if (mongoLogging) {
		transports.push(
			new MongooseTransport({
				level: logLevel,
				silent: false
			})
		);
	}

	// Create the logger
	const logger = new Logger({
		serviceName,
		level: logLevel,
		exitOnError: false,
		transports,
		exceptionHandlers: [
			...(consoleLogging ? [new winston.transports.Console()] : []),
			...(fileLogging
				? [
						new winston.transports.File({
							dirname: logDir,
							filename: `${serviceName}-exceptions.log`
						})
					]
				: [])
		],
		rejectionHandlers: [
			...(consoleLogging ? [new winston.transports.Console()] : []),
			...(fileLogging
				? [
						new winston.transports.File({
							dirname: logDir,
							filename: `${serviceName}-rejections.log`
						})
					]
				: [])
		]
	});

	// Log successful initialization
	logger.info('Logging system initialized', {
		environment,
		serviceName,
		logLevel,
		transports: {
			console: consoleLogging,
			file: fileLogging,
			mongo: mongoLogging
		}
	});

	return logger;
}
