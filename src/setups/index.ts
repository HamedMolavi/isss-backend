import { setupInteractive } from '../interactive/interactive.cluster';
import connectToDBs from '../db/index.database';
import { setUpPassport } from './passport.setup';
import seedSetup from './seed.setup';
import { initBalancer } from '../tools/loadBalancer.tools';
import { SignalConsumer } from '../tools/systemSignal.tools';
import { setupLogger } from './logger.setup';
import { initializeSecurityConfig } from '../config/security.config';
import { LogIntegrityService } from '../services/logIntegrity.service';
import { BackupSchedulerService } from '../services/backupScheduler.service';
import { AnalyticsCacheSchedulerService } from '../services/analyticsCacheScheduler.service';
import { initializeAnalyticsCacheJobs } from '../config/analyticsCacheJobs.config';
import { getIncrementalClusterCache } from '../services/incrementalClusterCache.service';
import { getSessionManager } from '../services/session.service';
import { UserIntegrityService } from '../services/userIntegrity.service';

export default async function setup() {
	await setupInteractive();
	// Register MongoDB connection monitoring before the first connection attempt.
	// This guarantees that startup failures are written to fallback storage too.
	await setupLogger();
	const dbResults = await connectToDBs({
		mongo: process.env['MONGODB_URL'].split(',').map((el) => el.trim()),
		redis: process.env['REDIS_URL'],
		elastic: process.env['ELASTIC_SEARCH'],
		sqlite: process.env['SQLITE_PATH']
	});
	process.esclient = dbResults['elastic'];

	// Initialize security configuration after database connection
	await initializeSecurityConfig();

	await seedSetup();
	setUpPassport();
	await initBalancer();
	await SignalConsumer.setupDefault();
	try {
		const userIntegrityService = UserIntegrityService.getInstance();
		await userIntegrityService.initializeProtection();
		userIntegrityService.startMonitoring();
		console.log('User record integrity monitoring initialized successfully');
	} catch (error) {
		console.error('Failed to initialize user record integrity monitoring:', error);
	}

	// Start Redis expiration monitoring at application startup. Initializing this
	// only after a login misses expirations after worker restarts and during
	// periods where no new user logs in.
	try {
		await getSessionManager();
		console.log('Session expiration monitoring initialized successfully');
	} catch (error) {
		console.error('Failed to initialize session expiration monitoring:', error);
	}

	// Initialize backup scheduler
	try {
		const backupScheduler = BackupSchedulerService.getInstance();
		await backupScheduler.start();
	} catch (error) {
		console.error('Failed to start backup scheduler:', error);
	}

	// // Initialize log integrity service and setup modification trigger
	try {
		const logIntegrityService = LogIntegrityService.getInstance();
		await logIntegrityService.disableLegacyAutomaticDeletion();
		logIntegrityService.setupLogModificationTrigger();
		console.log('Log integrity service initialized successfully');
	} catch (error) {
		console.error('Failed to initialize log integrity service:', error);
	}

	// Initialize analytics cache background jobs (non-blocking)
	initializeAnalyticsCacheJobs()
		.then(() => {
			console.log('Analytics cache background jobs initialized successfully');
		})
		.catch((error) => {
			console.error('Failed to initialize analytics cache jobs:', error);
		});

	// Setup cleanup for analytics cache scheduler on shutdown
	process.on('SIGTERM', async () => {
		try {
			const analyticsCacheScheduler = AnalyticsCacheSchedulerService.getInstance();
			await analyticsCacheScheduler.cleanup();
			console.log('Analytics cache scheduler cleaned up successfully');
		} catch (error) {
			console.error('Failed to cleanup analytics cache scheduler:', error);
		}

		try {
			const incrementalClusterCache = getIncrementalClusterCache();
			await incrementalClusterCache.cleanup();
			console.log('Incremental cluster cache worker cleaned up successfully');
		} catch (error) {
			console.error('Failed to cleanup incremental cluster cache worker:', error);
		}
	});

	process.on('SIGINT', async () => {
		try {
			const analyticsCacheScheduler = AnalyticsCacheSchedulerService.getInstance();
			await analyticsCacheScheduler.cleanup();
			console.log('Analytics cache scheduler cleaned up successfully');
		} catch (error) {
			console.error('Failed to cleanup analytics cache scheduler:', error);
		}

		try {
			const incrementalClusterCache = getIncrementalClusterCache();
			await incrementalClusterCache.cleanup();
			console.log('Incremental cluster cache worker cleaned up successfully');
		} catch (error) {
			console.error('Failed to cleanup incremental cluster cache worker:', error);
		}
	});
}
