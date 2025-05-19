import mongoose from 'mongoose';
import { Logger } from '../logger';
import { Request } from 'express';

/**
 * Monitors and checks the status of the logs collection in MongoDB.
 * This function retrieves various statistics about the logs collection including size,
 * document count, and TTL deletion metrics.
 *
 * @param {Request} req - Express request object for logging context
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 *   - sizeMB: number - Size of logs collection in megabytes
 *   - documentCount: number - Total number of documents in logs collection
 *   - ttlDeletedCount: number - Count of documents deleted by TTL index
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
interface LogStats {
	sizeMB: number;
	documentCount: number;
	ttlDeletedCount: number;
}

export async function checkLogStatus(req: Request): Promise<LogStats> {
	const stats = {
		sizeMB: 0,
		documentCount: 0,
		ttlDeletedCount: 0
	};

	try {
		// Get collection stats using Mongoose
		const logCollection = mongoose.connection.db.collection('Log');
		const collStats = await logCollection.stats();
		stats.sizeMB = Number((collStats.size / (1024 * 1024)).toFixed(2));
		stats.documentCount = collStats.count;

		// Log the current status
		Logger.systemOperation(
			'Log collection status check',
			{
				action: 'status_check',
				component: 'LogMonitor',
				details: {
					sizeMB: stats.sizeMB,
					documentCount: stats.documentCount
				}
			},
			req
		);

		// Simple threshold checks
		if (stats.sizeMB > 1000) {
			Logger.systemOperation(
				'Log collection size warning',
				{
					action: 'size_warning',
					component: 'LogMonitor',
					details: {
						sizeMB: stats.sizeMB,
						documentCount: stats.documentCount,
						threshold: 1000
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
						action: 'ttl_cleanup',
						component: 'LogMonitor',
						details: {
							deletedCount: stats.ttlDeletedCount
						}
					},
					req
				);
			}
		} catch (_) {
			// Ignore if serverStatus permission error
		}

		return stats;
	} catch (error) {
		Logger.systemOperation(
			'Log status check failed',
			{
				action: 'status_check_error',
				component: 'LogMonitor',
				details: {
					error: error
				}
			},
			req
		);
		throw error;
	}
}
