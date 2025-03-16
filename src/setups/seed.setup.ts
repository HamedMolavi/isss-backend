import { makeSeedCarBrand } from "../db/mongo/seeds/brand.seed";
import { makeSeedCarColor } from "../db/mongo/seeds/color.seed";

export default async () => {
  let carBrand = await makeSeedCarBrand();
  let carColor = await makeSeedCarColor();
};