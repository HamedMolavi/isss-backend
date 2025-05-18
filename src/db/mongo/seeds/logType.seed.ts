import { ILogType } from '../../../types/interfaces/logType.interface';
import { DEFAULT_LOG_TYPE, LogType } from '../models/logType';

export async function makeSeedLogType(): Promise<ILogType> {
	try {
		// Check for existing default log type
		const existingLogType = await LogType.findOne({ name: 'default' });
		if (existingLogType) {
			return existingLogType;
		}

		// Create new default log type
		console.log('Initializing default log type configuration');
		const logType = await new LogType({
			...DEFAULT_LOG_TYPE,
			ts: Date.now()
		}).save();

		console.log('\t++ Seed data LogType: name=default created successfully');
		return logType;
	} catch (err) {
		console.error('Error initializing log type:', err);
		throw err;
	}
}
