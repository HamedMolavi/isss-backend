import { makeSeedAccessLevel } from "../db/mongo/seeds/accessLevel.seed";
import { makeSeedUser } from "../db/mongo/seeds/user.seed";
import { makeSeedDepartment } from "../db/mongo/seeds/department.seed";
import { makeSeedSection } from "../db/mongo/seeds/section.seed";
import { makeSeedJob } from "../db/mongo/seeds/jobTitle.seed";
import { makeSeedModel } from "../db/mongo/seeds/model.seed";
import { makeSeedCarBrand } from "../db/mongo/seeds/brand.seed";
import { makeSeedCarColor } from "../db/mongo/seeds/color.seed";

export default async () => {
  let accessLevel = await makeSeedAccessLevel();
  let admin = await makeSeedUser(accessLevel);
  let Department = await makeSeedDepartment();
  let Section = await makeSeedSection(Department);
  let Job = await makeSeedJob();
  let Model = await makeSeedModel();
  let CarBrand = await makeSeedCarBrand();
  let CarColor = await makeSeedCarColor();
};