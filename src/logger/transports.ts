import Transport from 'winston-transport';
import { ILog } from '../types/interfaces/secLog.interface';
import { LOG_TYPE_KEYS } from '../types/enums/logType.enum';
import { Request } from 'express';
import { ILogType } from '../types/interfaces/logType.interface';
import { DEFAULT_LOG_TYPE, LogType } from '../db/mongo/models/logType';
import { Log } from '../db/mongo/models/secLog';
import { appendFileSync } from 'fs';
import { get_user_agent } from '../tools/user_agent.utility';

export class MongooseTransport extends Transport {
	handlers: Record<LOG_TYPE_KEYS, (req: Request) => string | number | undefined | Record<string, unknown>> = {
		method: (req: Request) => req.method,
		ip: (req: Request) => req.ip,
		user: (req: Request) => req.user?.username,
		result: (req: Request) => req.res?.statusCode,
		url: (req: Request) => req.url,
		userAgent: (req: Request) => get_user_agent(req),
		body: (req: Request) => req.body,
		query: (req: Request) => req.query,
		params: (req: Request) => req.params
	};

	public static logType: ILogType = DEFAULT_LOG_TYPE;

	constructor(options?: Transport.TransportStreamOptions) {
		super(options);
		this.level = options?.level || 'info';

		// Initialize log type from database
		this.initializeLogType();
	}

	/**
	 * Initializes the log type configuration from the database
	 */
	private initializeLogType(): void {
		LogType.findOne({})
			.sort({ ts: -1 })
			.exec()
			.then((doc) => {
				if (doc) {
					MongooseTransport.logType = doc.toJSON();
				}
			})
			.catch((err) => {
				console.error('Error fetching log type configuration:', err);
			});
	}

	/**
	 * Prepares metadata from request based on current log type settings
	 */
	prepareMeta(req: Request): Record<string, string | number | boolean | object | undefined> {
		if (!req) return {};

		const meta: Record<string, string | number | boolean | object | undefined> = {};

		// Add basic request metadata
		meta.timestamp = new Date();
		meta.url = req.url;
		meta.method = req.method;

		// Add user agent info
		const userAgentInfo = get_user_agent(req);
		meta.userAgent = userAgentInfo;

		// Add other request metadata based on logType configuration
		for (const key of Object.keys(LOG_TYPE_KEYS) as Array<LOG_TYPE_KEYS>) {
			if (MongooseTransport.logType[key] && this.handlers[key]) {
				try {
					const value = this.handlers[key].call(this, req);
					if (value !== undefined) {
						meta[key] = value;
					}
				} catch (error: unknown) {
					meta[`${key}_error`] = 'Error extracting value';
					console.error(`Error extracting ${key}:`, error);
				}
			}
		}

		return meta;
	}

	/**
	 * Winston transport log method implementation
	 */
	log(infoAndReq: ILog & { req?: Request }, callback: () => void): void {
		try {
			// Create the log document
			const log = new Log({
				...infoAndReq
			});
			// Signal that the log was processed
			setImmediate(() => this.emit('logged', log));
			// Save directly to MongoDB (hash will be generated in pre-save hook)
			log.save().catch((err) => {
				console.error('Error saving log to MongoDB:', err);
				this.saveFallbackLog(log);
			});
		} catch (err) {
			console.error('Error in log processing:', err);
			this.saveFallbackLog(infoAndReq);
		}

		// Always call callback to prevent blocking
		callback();
	}

	/**
	 * Saves a log to fallback storage when MongoDB fails
	 */
	private saveFallbackLog(log: ILog & { req?: Request }): void {
		try {
			appendFileSync('fallback-logs.json', JSON.stringify(log) + '\n');
		} catch (fallbackErr) {
			console.error('Failed to write to fallback log file:', fallbackErr);
		}
	}
}
