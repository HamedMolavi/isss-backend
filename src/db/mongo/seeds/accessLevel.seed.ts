import { IAccessLevel } from '../../../types/interfaces/accessLevel.interface';
import { create } from '../create.database';
import AccessLevel from '../models/accessLevel';
import { read } from '../read.database';

export async function makeSeedAccessLevel(): Promise<IAccessLevel> {
	let adminLevels: IAccessLevel[] = await read(AccessLevel, { query: { name: 'admin' } });
	if (!adminLevels.length) {
		adminLevels = await create(AccessLevel, {
			name: 'admin',
			camera: 15,
			car: 15,
			color: 15,
			brand: 15,
			section: 15,
			department: 15,
			job: 15,
			personnel: 15,
			schedule: 15,
			user: 15,
			typeName: 15,
			system: 15,
			systemLog: 15,
			logs: 2,
			product: 15,
			report: 15,
			dataImportExport: 15
		});
		console.log('\t++ Seed data access level: name=admin');
	}
	const defaultLevels = await read(AccessLevel, { query: { name: 'default' } });
	if (!defaultLevels.length) {
		await create(AccessLevel, {
			name: 'default',
			camera: 0,
			car: 0,
			color: 0,
			brand: 0,
			section: 0,
			department: 0,
			job: 0,
			personnel: 0,
			schedule: 0,
			user: 0,
			typeName: 0,
			system: 0,
			systemLog: 0,
			logs: 0,
			product: 0,
			report: 0,
			dataImportExport: 0
		});
		console.log('\t++ Seed data access level: name=default');
	}
	return adminLevels[0];
}
