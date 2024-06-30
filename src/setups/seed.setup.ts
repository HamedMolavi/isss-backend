import { makeSeedAccessLevel } from "../db/mongo/seeds/accessLevel.seed";
import { makeSeedUser } from "../db/mongo/seeds/user.seed";
import { makeSeedDepartment } from "../db/mongo/seeds/department.seed";
import { makeSeedSection } from "../db/mongo/seeds/section.seed";
import { makeSeedJob } from "../db/mongo/seeds/jobTitle.seed";
import { makeSeedModel } from "../db/mongo/seeds/model.seed";
import { makeSeedCarBrand } from "../db/mongo/seeds/brand.seed";
import { makeSeedCarColor } from "../db/mongo/seeds/color.seed";
import { makeSeedLogType } from "../db/mongo/seeds/logType.seed";
import { makeSeedPersonnel } from "../db/mongo/seeds/personnel.seed";

export default async () => {
  let accessLevel = await makeSeedAccessLevel();
  let admin = await makeSeedUser(accessLevel);
  let department = await makeSeedDepartment();
  let dection = await makeSeedSection(department);
  let job = await makeSeedJob();
  let model = await makeSeedModel();
  let carBrand = await makeSeedCarBrand();
  let carColor = await makeSeedCarColor();
  let logTypes = await makeSeedLogType();
  let personnel = await makeSeedPersonnel();
};