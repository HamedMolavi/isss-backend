import { makeSeedAccessLevel } from '../db/mongo/seeds/accessLevel.seed';
import { makeSeedUser } from '../db/mongo/seeds/user.seed';
import { makeSeedDepartment } from '../db/mongo/seeds/department.seed';
import { makeSeedSection } from '../db/mongo/seeds/section.seed';
import { makeSeedJobs } from '../db/mongo/seeds/jobTitle.seed';
import { makeSeedModel } from '../db/mongo/seeds/model.seed';
import { makeSeedCarBrand } from '../db/mongo/seeds/brand.seed';
import { makeSeedCarColor } from '../db/mongo/seeds/color.seed';
import { makeSeedLogType } from '../db/mongo/seeds/logType.seed';
import { makeSeedPersonnel } from '../db/mongo/seeds/personnel.seed';
import { seedSecurityConfig } from '../db/mongo/seeds/securityConfig.seed';

export default async () => {
	const accessLevel = await makeSeedAccessLevel();
	makeSeedUser(accessLevel);
	const department = await makeSeedDepartment();
	await makeSeedSection(department);
	await makeSeedJobs();
	await makeSeedModel();
	await makeSeedCarBrand();
	await makeSeedCarColor();
	await makeSeedLogType();
	await makeSeedPersonnel();
	await seedSecurityConfig();
};
