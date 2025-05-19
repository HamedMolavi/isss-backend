import Transport from 'winston-transport';
import { ILog } from '../types/interfaces/secLog.interface';
import { Request } from 'express';
import { ILogType } from '../types/interfaces/logType.interface';
import { LogType } from '../db/mongo/models/logType';
import { Log } from '../db/mongo/models/secLog';
import { appendFileSync } from 'fs';
import { LOG_TYPE_KEYS } from '../types/enums/logType.enum';

export class MongooseTransport extends Transport {
	private static _logType: ILogType | null = null;

	constructor(options?: Transport.TransportStreamOptions) {
		super(options);
		this.level = options?.level || 'info';
		this.loadLogType();
	}

	private async loadLogType(): Promise<void> {
		try {
			const doc = await LogType.findOne({ name: 'default' }).sort({ ts: -1 }).exec();
			if (!doc) {
				console.warn('No default LogType configuration found in database');
				return;
			}
			MongooseTransport._logType = doc.toJSON();
		} catch (err) {
			console.error('Error loading log type configuration:', err);
		}
	}

	/**
	 * Filters metadata based on enabled fields in logType
	 */
	private filterMetadata(
		metadata: Partial<Record<keyof ILogType, unknown>>
	): Partial<Record<keyof ILogType, unknown>> {
		const logType = MongooseTransport._logType;
		const filtered: Partial<Record<keyof ILogType, unknown>> = {};

		// Ensure we have valid metadata and logType
		if (!metadata || !logType) {
			console.warn('Invalid metadata or logType configuration');
			return {};
		}

		// Filter based on logType configuration
		for (const [key, value] of Object.entries(metadata)) {
			if (key in LOG_TYPE_KEYS && key in logType && logType[key as keyof ILogType] === true) {
				filtered[key as keyof ILogType] = value;
			}
		}

		return filtered;
	}

	/**
	 * Winston transport log method implementation
	 */
	log(infoAndReq: ILog & { req?: Request }, callback: () => void): void {
		try {
			// Filter metadata based on logType configuration
			const filteredMetadata = this.filterMetadata(infoAndReq.metadata || {});

			// Create the log document with filtered metadata
			const log = new Log({
				level: infoAndReq.level,
				timestamp: infoAndReq.timestamp,
				message: infoAndReq.message,
				metadata: filteredMetadata
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
