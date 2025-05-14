import { ILogType } from '../../../types/interfaces/logType.interface';
import { read } from '../read.database';
import { DEFAULT_LOG_TYPE, LogType } from '../models/logType';

export async function makeSeedLogType(): Promise<ILogType> {
	const dLogTypes = await read(LogType, { query: { name: 'default' } });
	if (!dLogTypes.length) {
		const logType = await new LogType(DEFAULT_LOG_TYPE).save();
		console.log('\t++ Seed data LogType: name=default');
		return logType;
	}
	return dLogTypes[0];
}
