import mongoose from 'mongoose';
import { Logger } from '../logger';
import { Request } from 'express';

// Log monitor action types for consistent logging
const LOG_MONITOR_ACTIONS = {
	STATUS_CHECK: 'log_status_check',
	SIZE_WARNING: 'log_size_warning',
	TTL_CLEANUP: 'log_ttl_cleanup',
	ERROR: 'log_monitor_error',
	THRESHOLD_EXCEEDED: 'log_threshold_exceeded',
	PERFORMANCE_WARNING: 'log_performance_warning'
} as const;

/**
 * Interface for log collection statistics
 */
interface LogStats {
	sizeMB: number;
	documentCount: number;
	ttlDeletedCount: number;
	averageDocumentSize: number;
	indexSizeMB: number;
	lastAccessTime?: Date;
	errorCount?: number;
	warningCount?: number;
	infoCount?: number;
	debugCount?: number;
}

/**
 * Interface for log monitoring thresholds
 */
interface LogThresholds {
	maxSizeMB: number;
	maxDocumentCount: number;
	maxAverageDocumentSize: number;
	maxIndexSizeMB: number;
	errorThreshold: number;
	warningThreshold: number;
}

/**
 * Default thresholds for log monitoring
 */
const DEFAULT_THRESHOLDS: LogThresholds = {
	maxSizeMB: 1000,
	maxDocumentCount: 1000000,
	maxAverageDocumentSize: 0.1, // MB
	maxIndexSizeMB: 100,
	errorThreshold: 1000,
	warningThreshold: 5000
};

/**
 * Monitors and checks the status of the logs collection in MongoDB.
 * This function retrieves various statistics about the logs collection including size,
 * document count, TTL deletion metrics, and additional performance metrics.
 *
 * @param {Request} req - Express request object for logging context
 * @param {LogThresholds} [thresholds] - Optional custom thresholds for monitoring
 * @returns {Promise<LogStats>} A promise that resolves to an object containing log collection statistics
 *
 * @throws {Error} If connection to MongoDB fails or if stats cannot be retrieved
 *
 * @example
 * try {
 *   const stats = await checkLogStatus(req);
 *   console.log(`Logs size: ${stats.sizeMB}MB, Count: ${stats.documentCount}`);
 * } catch (error) {
 *   console.error('Failed to check log status:', error);
 * }
 */

export async function checkLogStatus(
	req: Request,
	thresholds: LogThresholds = DEFAULT_THRESHOLDS
): Promise<LogStats> {
	const stats: LogStats = {
		sizeMB: 0,
		documentCount: 0,
		ttlDeletedCount: 0,
		averageDocumentSize: 0,
		indexSizeMB: 0
	};

	try {
		// Get collection stats using Mongoose
		const logCollection = mongoose.connection.db.collection('Log');
		const collStats = await logCollection.stats();

		// Calculate basic stats
		stats.sizeMB = Number((collStats.size / (1024 * 1024)).toFixed(2));
		stats.documentCount = collStats.count;
		stats.averageDocumentSize = Number((stats.sizeMB / stats.documentCount).toFixed(4));
		stats.indexSizeMB = Number((collStats.totalIndexSize / (1024 * 1024)).toFixed(2));

		// Get log level counts
		const levelCounts = await logCollection
			.aggregate([
				{
					$group: {
						_id: '$type',
						count: { $sum: 1 }
					}
				}
			])
			.toArray();

		levelCounts.forEach((level) => {
			switch (level._id) {
				case 'error':
					stats.errorCount = level.count;
					break;
				case 'warning':
					stats.warningCount = level.count;
					break;
				case 'info':
					stats.infoCount = level.count;
					break;
				case 'debug':
					stats.debugCount = level.count;
					break;
			}
		});

		// Get last access time
		const lastLog = await logCollection.findOne({}, { sort: { createdAt: -1 } });
		if (lastLog) {
			stats.lastAccessTime = lastLog.createdAt;
		}

		// Log the current status
		Logger.systemOperation(
			'Log collection status check',
			{
				type: 'log_monitor',
				action: LOG_MONITOR_ACTIONS.STATUS_CHECK,
				details: {
					sizeMB: stats.sizeMB,
					documentCount: stats.documentCount,
					averageDocumentSize: stats.averageDocumentSize,
					indexSizeMB: stats.indexSizeMB,
					errorCount: stats.errorCount,
					warningCount: stats.warningCount,
					infoCount: stats.infoCount,
					debugCount: stats.debugCount,
					lastAccessTime: stats.lastAccessTime
				}
			},
			req
		);

		// Check thresholds and log warnings
		if (stats.sizeMB > thresholds.maxSizeMB) {
			Logger.systemOperation(
				'Log collection size warning',
				{
					type: 'log_monitor',
					action: LOG_MONITOR_ACTIONS.SIZE_WARNING,
					details: {
						sizeMB: stats.sizeMB,
						threshold: thresholds.maxSizeMB,
						documentCount: stats.documentCount
					}
				},
				req
			);
		}

		if (stats.documentCount > thresholds.maxDocumentCount) {
			Logger.systemOperation(
				'Log collection document count threshold exceeded',
				{
					type: 'log_monitor',
					action: LOG_MONITOR_ACTIONS.THRESHOLD_EXCEEDED,
					details: {
						documentCount: stats.documentCount,
						threshold: thresholds.maxDocumentCount
					}
				},
				req
			);
		}

		if (stats.averageDocumentSize > thresholds.maxAverageDocumentSize) {
			Logger.systemOperation(
				'Log collection average document size warning',
				{
					type: 'log_monitor',
					action: LOG_MONITOR_ACTIONS.PERFORMANCE_WARNING,
					details: {
						averageDocumentSize: stats.averageDocumentSize,
						threshold: thresholds.maxAverageDocumentSize
					}
				},
				req
			);
		}

		if (stats.errorCount && stats.errorCount > thresholds.errorThreshold) {
			Logger.systemOperation(
				'Log collection error count threshold exceeded',
				{
					type: 'log_monitor',
					action: LOG_MONITOR_ACTIONS.THRESHOLD_EXCEEDED,
					details: {
						errorCount: stats.errorCount,
						threshold: thresholds.errorThreshold
					}
				},
				req
			);
		}

		// Get TTL deletion stats
		try {
			const serverStatus = await mongoose.connection.db.command({ serverStatus: 1 });
			stats.ttlDeletedCount = serverStatus.metrics?.ttl?.deletedDocuments || 0;

			if (stats.ttlDeletedCount > 0) {
				Logger.systemOperation(
					'TTL cleanup completed',
					{
						type: 'log_monitor',
						action: LOG_MONITOR_ACTIONS.TTL_CLEANUP,
						details: {
							deletedCount: stats.ttlDeletedCount
						}
					},
					req
				);
			}
		} catch (error) {
			// Log permission error but continue
			Logger.systemOperation(
				'Failed to get TTL stats',
				{
					type: 'log_monitor',
					action: LOG_MONITOR_ACTIONS.ERROR,
					details: {
						error: error instanceof Error ? error.message : 'Unknown error',
						reason: 'serverStatus permission denied'
					}
				},
				req
			);
		}

		return stats;
	} catch (error) {
		Logger.systemOperation(
			'Log status check failed',
			{
				type: 'log_monitor',
				action: LOG_MONITOR_ACTIONS.ERROR,
				details: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			req
		);
		throw error;
	}
}
