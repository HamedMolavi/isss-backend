import { Logger } from '../logger';
import { getAnalyticsCacheService } from './analyticsCache.service';

interface ScheduledRefreshJob {
	endpoint: string;
	params: Record<string, unknown>;
	refreshFunction: () => Promise<unknown>;
	intervalSeconds: number;
	intervalId: NodeJS.Timeout;
}

export class AnalyticsCacheSchedulerService {
	private static instance: AnalyticsCacheSchedulerService;
	private jobs: Map<string, ScheduledRefreshJob> = new Map();
	private logger: Logger;

	private constructor() {
		this.logger = new Logger({ serviceName: 'AnalyticsCacheScheduler' });
	}

	public static getInstance(): AnalyticsCacheSchedulerService {
		if (!AnalyticsCacheSchedulerService.instance) {
			AnalyticsCacheSchedulerService.instance = new AnalyticsCacheSchedulerService();
		}
		return AnalyticsCacheSchedulerService.instance;
	}

	/**
	 * Schedule a background refresh job for an analytics endpoint
	 * @param runImmediately - If true, runs the refresh immediately before scheduling
	 */
	public async scheduleRefresh(
		endpoint: string,
		params: Record<string, unknown>,
		refreshFunction: () => Promise<unknown>,
		intervalSeconds: number = 300,
		runImmediately: boolean = true
	): Promise<void> {
		const jobKey = this.generateJobKey(endpoint, params);

		if (this.jobs.has(jobKey)) {
			this.logger.info('Refresh job already scheduled', { endpoint, jobKey });
			return;
		}

		// Run immediately on startup if requested (non-blocking)
		if (runImmediately) {
			this.logger.info('Running initial refresh on startup', { endpoint });
			// Fire and forget - don't await
			this.executeRefresh(endpoint, params, refreshFunction, intervalSeconds).catch((error) => {
				this.logger.error('Initial refresh failed', { endpoint, error });
			});
		}

		// Schedule periodic refresh
		const intervalId = setInterval(async () => {
			await this.executeRefresh(endpoint, params, refreshFunction, intervalSeconds);
		}, intervalSeconds * 1000);

		this.jobs.set(jobKey, {
			endpoint,
			params,
			refreshFunction,
			intervalSeconds,
			intervalId
		});

		this.logger.info('Scheduled analytics cache refresh job', {
			endpoint,
			intervalSeconds,
			jobKey,
			runImmediately
		});
	}

	/**
	 * Execute a single refresh cycle with timeout protection
	 */
	private async executeRefresh(
		endpoint: string,
		params: Record<string, unknown>,
		refreshFunction: () => Promise<unknown>,
		intervalSeconds: number
	): Promise<void> {
		const startTime = Date.now();

		try {
			const cacheService = await getAnalyticsCacheService();

			const isCurrentlyRefreshing = await cacheService.isRefreshing(endpoint, params);
			if (isCurrentlyRefreshing) {
				this.logger.info('Refresh already in progress, skipping', { endpoint });
				return;
			}

			// Configurable timeout (default 1 hour for large datasets)
			// Set ANALYTICS_REFRESH_TIMEOUT_MINUTES in env to override
			const timeoutMinutes = parseInt(process.env['ANALYTICS_REFRESH_TIMEOUT_MINUTES'] || '60', 10);
			const timeoutMs = timeoutMinutes * 60 * 1000;
			const lockSeconds = Math.ceil(timeoutMinutes * 60 * 1.1); // 10% buffer for lock

			this.logger.info('Starting background cache refresh', {
				endpoint,
				timeoutMinutes,
				lockSeconds
			});
			await cacheService.setRefreshing(endpoint, params, true, lockSeconds);

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() => reject(new Error(`Refresh timeout exceeded (${timeoutMinutes} minutes)`)),
					timeoutMs
				);
			});

			const data = await Promise.race([refreshFunction(), timeoutPromise]);

			const duration = Date.now() - startTime;
			await cacheService.setCachedData(endpoint, params, data, intervalSeconds + 60);

			await cacheService.setRefreshing(endpoint, params, false);
			this.logger.info('Background cache refresh completed', {
				endpoint,
				durationMs: duration,
				durationSeconds: Math.round(duration / 1000)
			});
		} catch (error) {
			const duration = Date.now() - startTime;
			this.logger.error('Background cache refresh failed', {
				error: error instanceof Error ? error.message : String(error),
				endpoint,
				durationMs: duration,
				durationSeconds: Math.round(duration / 1000)
			});

			try {
				const cacheService = await getAnalyticsCacheService();
				await cacheService.setRefreshing(endpoint, params, false);
			} catch (cleanupError) {
				this.logger.error('Failed to clear refresh lock', { cleanupError });
			}
		}
	}

	/**
	 * Cancel a scheduled refresh job
	 */
	public cancelRefresh(endpoint: string, params: Record<string, unknown>): void {
		const jobKey = this.generateJobKey(endpoint, params);
		const job = this.jobs.get(jobKey);

		if (job) {
			clearInterval(job.intervalId);
			this.jobs.delete(jobKey);
			this.logger.info('Cancelled analytics cache refresh job', { endpoint, jobKey });
		}
	}

	/**
	 * Cancel all scheduled refresh jobs
	 */
	public cancelAllRefreshes(): void {
		for (const [jobKey, job] of this.jobs.entries()) {
			clearInterval(job.intervalId);
			this.logger.info('Cancelled refresh job', { endpoint: job.endpoint, jobKey });
		}
		this.jobs.clear();
	}

	/**
	 * Get all active refresh jobs
	 */
	public getActiveJobs(): Array<{
		endpoint: string;
		params: Record<string, unknown>;
		intervalSeconds: number;
	}> {
		return Array.from(this.jobs.values()).map((job) => ({
			endpoint: job.endpoint,
			params: job.params,
			intervalSeconds: job.intervalSeconds
		}));
	}

	/**
	 * Check if a refresh job is scheduled
	 */
	public isJobScheduled(endpoint: string, params: Record<string, unknown>): boolean {
		const jobKey = this.generateJobKey(endpoint, params);
		return this.jobs.has(jobKey);
	}

	/**
	 * Generate a unique key for a job
	 */
	private generateJobKey(endpoint: string, params: Record<string, unknown>): string {
		const sortedParams = Object.keys(params)
			.sort()
			.reduce(
				(acc, key) => {
					acc[key] = params[key];
					return acc;
				},
				{} as Record<string, unknown>
			);

		const paramsString = JSON.stringify(sortedParams);
		return `${endpoint}:${Buffer.from(paramsString).toString('base64')}`;
	}

	/**
	 * Cleanup on shutdown
	 */
	public async cleanup(): Promise<void> {
		this.logger.info('Cleaning up analytics cache scheduler', {
			activeJobs: this.jobs.size
		});
		this.cancelAllRefreshes();
	}
}

export const getAnalyticsCacheScheduler = () => AnalyticsCacheSchedulerService.getInstance();
