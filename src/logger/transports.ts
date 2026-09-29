import Transport from 'winston-transport';
import { ILog } from '../types/interfaces/secLog.interface';
import { Request } from 'express';
import { ILogType } from '../types/interfaces/logType.interface';
import { LogType } from '../db/mongo/models/logType';
import { Log } from '../db/mongo/models/secLog';
import { appendFileSync } from 'fs';
import { appendFile, readFile, rename, unlink } from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import { LOG_TYPE_KEYS } from '../types/enums/logType.enum';

export const FALLBACK_LOG_PATH = path.resolve(process.env['FALLBACK_LOG_PATH'] || 'fallback-logs.json');

export class MongooseTransport extends Transport {
	private static _logType: ILogType | null = null;
	private static replayPromise: Promise<void> | null = null;
	private static connectionListenersRegistered = false;
	private static mongoOutageRecorded = false;
	private static readonly fallbackPath = FALLBACK_LOG_PATH;
	private disableFilter: boolean;

	constructor(options?: Transport.TransportStreamOptions & { disableFilter?: boolean }) {
		super(options);
		this.level = options?.level || 'info';
		this.disableFilter = options?.disableFilter || false;
		this.loadLogType();
		this.registerFallbackReplay();
	}

	private registerFallbackReplay(): void {
		if (!MongooseTransport.connectionListenersRegistered) {
			MongooseTransport.connectionListenersRegistered = true;
			mongoose.connection.on('connected', () => {
				MongooseTransport.mongoOutageRecorded = false;
				void MongooseTransport.replayFallbackLogs();
			});
			mongoose.connection.on('reconnected', () => {
				MongooseTransport.mongoOutageRecorded = false;
				void MongooseTransport.replayFallbackLogs();
			});
			mongoose.connection.on('disconnected', () => {
				this.recordMongoConnectionFailure('MongoDB connection was lost');
			});
			mongoose.connection.on('error', (error: Error) => {
				if (mongoose.connection.readyState !== 1) {
					this.recordMongoConnectionFailure(error.message);
				}
			});
		}

		// The transport is normally created after the initial database connection,
		// so the connected event may already have fired.
		if (mongoose.connection.readyState === 1) {
			void MongooseTransport.replayFallbackLogs();
		}
	}

	private recordMongoConnectionFailure(error: string): void {
		if (MongooseTransport.mongoOutageRecorded) return;
		MongooseTransport.mongoOutageRecorded = true;
		this.saveFallbackLog({
			_id: new mongoose.Types.ObjectId().toString(),
			level: 'error',
			timestamp: new Date(),
			message: 'MongoDB connection failed',
			action: 'mongodb_connection_failed',
			metadata: {
				type: 'system',
				action: 'mongodb_connection_failed',
				success: false,
				username: 'database-monitor',
				details: { error }
			}
		});
	}

	private async loadLogType(): Promise<void> {
		try {
			const doc = await LogType.findOne({ isActive: true }).sort({ ts: -1 }).exec();

			if (!doc) {
				console.warn('No active LogType configuration found in database');
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
		if (this.disableFilter) {
			return metadata;
		}

		const logType = MongooseTransport._logType;
		const filtered: Partial<Record<keyof ILogType, unknown>> = {};

		// Ensure we have valid metadata and logType
		if (!metadata) {
			console.warn('Invalid metadata or logType configuration');
			return {};
		}

		// If MongoDB is unavailable before LogType can be loaded, retain the
		// supported audit fields so fallback records remain visible and useful.
		if (!logType) {
			for (const [key, value] of Object.entries(metadata)) {
				if (key in LOG_TYPE_KEYS) filtered[key as keyof ILogType] = value;
			}
			return filtered;
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
			// Extract action from metadata or use default
			const action =
				infoAndReq.metadata?.action ||
				infoAndReq.action ||
				(infoAndReq.metadata?.type ? `${infoAndReq.metadata.type}_operation` : 'system_operation');

			// Filter metadata based on logType configuration
			const filteredMetadata = this.filterMetadata(infoAndReq.metadata || {});

			// Create the log document with filtered metadata
			const log = new Log({
				level: infoAndReq.level,
				timestamp: infoAndReq.timestamp,
				message: infoAndReq.message,
				action, // Ensure action is always set
				metadata: {
					...filteredMetadata,
					action // Include action in metadata as well
				}
			});

			// Signal that the log was processed
			setImmediate(() => this.emit('logged', log));
			if (mongoose.connection.readyState !== 1) {
				this.recordMongoConnectionFailure('MongoDB is not connected');
				this.saveFallbackLog(log);
				callback();
				return;
			}
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
	private saveFallbackLog(log: unknown): void {
		try {
			const serializableLog = log as unknown as { toObject?: () => unknown };
			const fallbackRecord =
				typeof serializableLog.toObject === 'function' ? serializableLog.toObject() : log;
			appendFileSync(MongooseTransport.fallbackPath, JSON.stringify(fallbackRecord) + '\n', {
				encoding: 'utf8',
				mode: 0o600,
				flag: 'a'
			});
		} catch (fallbackErr) {
			console.error('Failed to write to fallback log file:', fallbackErr);
		}
	}

	/**
	 * Replays file-backed logs after MongoDB reconnects.
	 *
	 * The active file is first renamed, so logs produced while replay is in
	 * progress are appended to a fresh file and cannot be lost by cleanup.
	 * Records keep their original MongoDB _id, making retries idempotent.
	 */
	static replayFallbackLogs(): Promise<void> {
		if (this.replayPromise) return this.replayPromise;

		this.replayPromise = this.performFallbackReplay().finally(() => {
			this.replayPromise = null;
		});

		return this.replayPromise;
	}

	private static async performFallbackReplay(): Promise<void> {
		if (mongoose.connection.readyState !== 1) return;

		// A stable replay filename allows a new process to resume after a crash.
		const replayPath = `${this.fallbackPath}.replaying`;
		let content: string;
		try {
			content = await readFile(replayPath, 'utf8');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				console.error('Failed to read in-progress fallback log replay:', error);
				return;
			}

			try {
				await rename(this.fallbackPath, replayPath);
				content = await readFile(replayPath, 'utf8');
			} catch (claimError) {
				if ((claimError as NodeJS.ErrnoException).code !== 'ENOENT') {
					console.error('Failed to claim fallback log file for replay:', claimError);
				}
				return;
			}
		}

		const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

		const remaining: string[] = [];
		let restored = 0;

		for (let index = 0; index < lines.length; index += 1) {
			const line = lines[index];

			if (mongoose.connection.readyState !== 1) {
				remaining.push(...lines.slice(index));
				break;
			}

			try {
				const storedLog = JSON.parse(line) as ILog & { _id?: unknown };
				if (!storedLog || typeof storedLog !== 'object') throw new Error('Invalid fallback log record');

				// A previous replay may have saved the document before the process stopped.
				if (storedLog._id && (await Log.exists({ _id: storedLog._id }))) {
					restored += 1;
					continue;
				}

				await new Log(storedLog).save();
				restored += 1;
			} catch (error) {
				if ((error as { code?: number }).code === 11000) {
					restored += 1;
					continue;
				}

				remaining.push(line);
				console.error('Failed to restore a fallback log:', error);
			}
		}

		try {
			if (remaining.length > 0) {
				await appendFile(this.fallbackPath, `${remaining.join('\n')}\n`, {
					encoding: 'utf8',
					mode: 0o600,
					flag: 'a'
				});
			}
			await unlink(replayPath);
			if (restored > 0) console.log(`Restored ${restored} fallback log(s) to MongoDB`);
		} catch (error) {
			console.error('Failed to finalize fallback log replay:', error);
		}
	}
}
