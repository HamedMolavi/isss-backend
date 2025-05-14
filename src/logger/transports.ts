import Transport from 'winston-transport';
import { ILog } from '../types/interfaces/secLog.interface';
import { LOG_TYPE_KEYS } from '../types/enums/logType.enum';
import { Request } from 'express';
import { ILogType } from '../types/interfaces/logType.interface';
import { DEFAULT_LOG_TYPE, LogType } from '../db/mongo/models/logType';
import { Log } from '../db/mongo/models/secLog';
import { appendFileSync } from 'fs';
import { Connection } from 'mongoose';

export class MongooseTransport extends Transport {
	handlers: Record<LOG_TYPE_KEYS, (req: Request) => string | number | undefined> = {
		method: (req: Request) => req.method,
		ip: (req: Request) => req.ip,
		user: (req: Request) => req.user?.username,
		result: (req: Request) => req.res?.statusCode
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
	prepareMeta(req: Request): Record<string, string | number | undefined> {
		if (!req) return {};

		const meta: Record<string, string | number | undefined> = {};

		for (const key of Object.keys(LOG_TYPE_KEYS) as Array<LOG_TYPE_KEYS>) {
			if (MongooseTransport.logType[key] && this.handlers[key]) {
				try {
					meta[key] = this.handlers[key].call(this, req);
				} catch (error: unknown) {
					meta[`${key}_error`] = 'Error extracting value';
					console.error(error);
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
				...infoAndReq,
				meta: infoAndReq.req ? this.prepareMeta(infoAndReq.req) : infoAndReq.meta || {},
				timestamp: new Date()
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

	/**
	 * Change the capped collection size
	 */
	static async changeSize(cappedSize: number): Promise<void> {
		try {
			const db = LogType.db as unknown as Connection;
			const buildInfo = await db.db.admin().command({ buildInfo: 1 });
			const isSupported = parseInt(buildInfo.version) >= 6;

			if (!isSupported) {
				throw new Error("MongoDB version doesn't support changing capped collection size");
			}

			await db.db.command({
				collMod: Log.collection.name,
				cappedSize
			});
		} catch (error) {
			throw new Error(
				`Failed to change capped collection size: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}
