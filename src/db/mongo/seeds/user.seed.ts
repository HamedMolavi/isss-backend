import { IAccessLevel } from '../../../types/interfaces/accessLevel.interface';
import { IUser } from '../../../types/interfaces/user.interface';
import { create } from '../create.database';
import User from '../models/user';
import { read } from '../read.database';

export async function makeSeedUser(accessLevel: IAccessLevel): Promise<IUser | undefined> {
	if (!(await read(User, { query: { role: 'admin' } })).length) {
		const users: IUser[] = await create(User, {
			event: true,
			camera: true,
			report: true,
			configuration: true,
			username: 'admin',
			password: '123',
			access_level: accessLevel._id,
			phone_number: '09330379999',
			role: 'admin',
			camera_access: []
		});
		console.log('\t++ Seed data user: username=test, password=123');
		return users[0];
	}
	return undefined;
}
