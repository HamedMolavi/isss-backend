import { IJobTitle } from '../../../types/interfaces/jobTitle.interface';
import { create } from '../create.database';
import JobTitle from '../models/jobTitle';
import { read } from '../read.database';

export async function makeSeedJobs(): Promise<Array<IJobTitle> | undefined> {
	const results = [];
	if (!(await read(JobTitle, { query: { name: 'guest' } })).length) {
		const jobs: IJobTitle[] = await create(JobTitle, {
			name: 'guest'
		});
		console.log('\t++ Seed data JobTitle: name=guest');
		results.push(jobs[0]);
	}
	if (!(await read(JobTitle, { query: { name: 'client' } })).length) {
		const jobs: IJobTitle[] = await create(JobTitle, {
			name: 'client'
		});
		console.log('\t++ Seed data JobTitle: name=client');
		results.push(jobs[0]);
	}
	return results;
}
