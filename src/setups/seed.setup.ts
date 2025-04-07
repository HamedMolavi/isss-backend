import { makeSeedCarBrand } from "../db/mongo/seeds/brand.seed";
import { makeSeedCarColor } from "../db/mongo/seeds/color.seed";
import { makeSeedUser } from "../db/mongo/seeds/user.seed";

export default async () => {
  let carBrand = await makeSeedCarBrand();
  let carColor = await makeSeedCarColor();
  await makeSeedUser();
};