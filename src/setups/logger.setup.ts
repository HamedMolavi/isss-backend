import winston from 'winston';
import { MongooseTransport } from '../logger/transports';
import { Logger } from '../logger';
import { SQLite } from '../db/sqlite';

export async function setupLogger() {
	SQLite.createTable('Hash');
	const transports = {
		console: new winston.transports.Console({
			level: 'info',
			format: winston.format.combine(winston.format.colorize(), winston.format.simple())
		}),
		file: new winston.transports.File({
			level: 'info',
			filename: 'combined.log',
			silent: false,
			maxsize: 10 * 1024 * 1024,
			maxFiles: 3,
			tailable: true,
			zippedArchive: true,
			format: winston.format.logstash()
		}),
		mongo: new MongooseTransport({ level: 'info', silent: false })
	};
	// const logger = winston.createLogger({
	const logger = new Logger({
		exitOnError: false,
		transports: [
			transports.mongo // transports.console,  transports.file,
		]
		// exceptionHandlers: [new winston.transports.File({ filename: 'exceptions.log' })],
		// rejectionHandlers: [new winston.transports.File({ filename: 'rejections.log' })]
	});
	return logger;
}
