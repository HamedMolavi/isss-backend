import { IDepartment } from '../../../types/interfaces/department.interface';
import { create } from '../create.database';
import Department from '../models/department';
import { read } from '../read.database';

export async function makeSeedDepartment(): Promise<IDepartment> {
	let departments: IDepartment[] = await read(Department, { query: { name: 'Department' } });
	if (!departments.length) {
		departments = await create(Department, {
			name: 'Department',
			is_enabled: true
		});
		console.log('\t++ Seed data department: name=Department');
	}
	return departments[0];
}
