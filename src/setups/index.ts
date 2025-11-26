import { setupInteractive } from '../interactive/interactive.cluster';
import connectToDBs from '../db/index.database';
import { setUpPassport } from './passport.setup';
import seedSetup from './seed.setup';
import { initBalancer } from '../tools/loadBalancer.tools';
import { SignalConsumer } from '../tools/systemSignal.tools';
import { setupLogger } from './logger.setup';
import { initializeSecurityConfig } from '../config/security.config';

export default async function setup() {
	await setupInteractive();
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
	await setupLogger();

	// Initialize backup scheduler
	// try {
	// 	const backupScheduler = BackupSchedulerService.getInstance();
	// 	await backupScheduler.start();
	// } catch (error) {
	// 	console.error('Failed to start backup scheduler:', error);
	// }

	// // Initialize log integrity service and setup modification trigger
	// try {
	// 	const logIntegrityService = LogIntegrityService.getInstance();
	// 	logIntegrityService.setupLogModificationTrigger();
	// 	console.log('Log integrity service initialized successfully');
	// } catch (error) {
	// 	console.error('Failed to initialize log integrity service:', error);
	// }
}
