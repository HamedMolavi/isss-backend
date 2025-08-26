import { IPersonnel } from '../../../types/interfaces/personnel.interface';
import { read } from '../read.database';
import { create } from '../create.database';
import Personnel from '../models/personnel';

export async function makeSeedPersonnel(): Promise<IPersonnel | undefined> {
	if (!(await read(Personnel, { query: { first_name: 'Global' } })).length) {
		const personnels: IPersonnel[] = await create(Personnel, {
			first_name: 'Global',
			last_name: 'Global',
			personnel_code: '1234'
		});
		console.log('\t++ Seed data Personnel: first_name=Global');
		return personnels[0];
	}
	return undefined;
}
