import { getAnalyticsCacheScheduler } from '../services/analyticsCacheScheduler.service';
import { Logger } from '../logger';
import { Worker } from 'worker_threads';
import * as path from 'path';

const logger = new Logger({ serviceName: 'AnalyticsCacheJobsConfig' });

interface AnalyticsJobConfig {
	endpoint: string;
	params: Record<string, unknown>;
	intervalSeconds: number;
	refreshFunction: () => Promise<unknown>;
}

/**
 * Initialize analytics cache background refresh jobs
 * These jobs run independently as cron-like tasks
 *
 * To add a background refresh job:
 * 1. Define the job configuration in the jobs array below
 * 2. Implement the refresh function that fetches and processes data
 * 3. The scheduler will automatically run the job at the specified interval
 *
 * Example:
 * {
 *   endpoint: 'my-analytics-endpoint',
 *   params: { date_start: '2024-01-01', date_end: '2024-12-31' },
 *   intervalSeconds: 3600, // Refresh every hour
 *   refreshFunction: async () => {
 *     // Your data fetching and processing logic here
 *     return { data: [], total: 0 };
 *   }
 * }
 */
export async function initializeAnalyticsCacheJobs(): Promise<void> {
	try {
		const scheduler = getAnalyticsCacheScheduler();

		// Define your background refresh jobs here
		const jobs: AnalyticsJobConfig[] = [
			// OPTIMIZED: Background refresh for most-repeated-unknown-faces
			// Strategy 1: Use sliding window (last 24 hours instead of 7 days)
			// Strategy 2: Limit data processing to prevent exponential growth
			// Strategy 3: Runs every 15 minutes with timeout protection
			{
				endpoint: 'most-repeated-unknown-faces',
				params: {
					// Use static cache key for rolling 24-hour window
					// This ensures all requests use the same cache regardless of exact timestamp
					window: 'rolling_24h',
					timez: 'Asia/Tehran',
					cameras: undefined,
					user_id: 'system'
				},
				intervalSeconds: 3600, // Refresh every 1 hour
				refreshFunction: async () => {
					// WORKER THREAD REFRESH: All operations run off main thread
					logger.info('Triggering incremental refresh in worker thread (non-blocking)');

					return new Promise((resolve, reject) => {
						// Determine if running in dev (ts-node) or prod (compiled)
						const isDev = __filename.endsWith('.ts');
						const workerExt = isDev ? '.ts' : '.js';
						const workerPath = path.resolve(__dirname, `../workers/incrementalRefresh.worker${workerExt}`);

						logger.info('Loading worker from path', { workerPath, isDev });

						const worker = new Worker(workerPath, {
							execArgv: isDev ? ['-r', 'ts-node/register'] : []
						});

						const messageHandler = (message: any) => {
							worker.off('message', messageHandler);
							worker.off('error', errorHandler);

							if (message.success) {
								logger.info('Worker refresh completed', message.result.stats);
								resolve({ data: message.result.data, total: message.result.total });
							} else {
								logger.error('Worker refresh failed', { error: message.error });
								resolve({ data: [], total: 0 });
							}

							worker.terminate();
						};

						const errorHandler = (error: Error) => {
							worker.off('message', messageHandler);
							worker.off('error', errorHandler);
							logger.error('Worker error', { error: error.message });
							resolve({ data: [], total: 0 });
							worker.terminate();
						};

						worker.on('message', messageHandler);
						worker.on('error', errorHandler);

						// Send config to worker
						worker.postMessage({
							type: 'refresh',
							esConfig: {
								node: process.env['ELASTIC_SEARCH'] || 'http://localhost:9200',
								auth: process.env['ELASTIC_USERNAME']
									? {
											username: process.env['ELASTIC_USERNAME'],
											password: process.env['ELASTIC_PASSWORD'] || ''
										}
									: undefined
							},
							redisConfig: {
								url: process.env['REDIS_URL'] || 'redis://localhost:6379'
							},
							params: {
								endpoint: 'most-repeated-unknown-faces',
								cacheParams: {
									timez: 'Asia/Tehran',
									user_id: 'system'
								},
								timezone: 'Asia/Tehran'
							}
						});
					});
				}
			},
			// OPTIONAL: Add separate job for weekly summary (runs less frequently)
			// This handles the 7-day window but runs only once per hour
			{
				endpoint: 'most-repeated-unknown-faces',
				params: {
					// Use fixed midnight-to-midnight boundaries for consistent cache keys
					// Yesterday 00:00:00 to today 23:59:59
					date_start: new Date(
						new Date().getFullYear(),
						new Date().getMonth(),
						new Date().getDate() - 1,
						0,
						0,
						0
					).toISOString(),
					date_end: new Date(
						new Date().getFullYear(),
						new Date().getMonth(),
						new Date().getDate(),
						23,
						59,
						59
					).toISOString(),
					time_start: '00:00',
					time_end: '23:59',
					timez: 'Asia/Tehran',
					time_filter: undefined,
					cameras: undefined,
					user_id: 'system'
				},
				intervalSeconds: 3600, // Refresh every hour (less frequent for larger dataset)
				refreshFunction: async () => {
					logger.info('Weekly background refresh triggered');
					return { data: [], total: 0 };
				}
			}
		];

		// Schedule all jobs in parallel to prevent startup blocking
		Promise.all(
			jobs.map(async (job) => {
				// Run immediately on startup (true), then every intervalSeconds
				await scheduler.scheduleRefresh(
					job.endpoint,
					job.params,
					job.refreshFunction,
					job.intervalSeconds,
					true // Run immediately on startup
				);
				logger.info('Scheduled analytics cache job', {
					endpoint: job.endpoint,
					intervalSeconds: job.intervalSeconds,
					runOnStartup: true
				});
			})
		).catch((error) => {
			logger.error('Error scheduling analytics cache jobs', { error });
		});

		logger.info('Analytics cache jobs initialization started (non-blocking)', { jobCount: jobs.length });
	} catch (error) {
		logger.error('Failed to initialize analytics cache jobs', {
			error: error instanceof Error ? error.message : String(error)
		});
	}
}
