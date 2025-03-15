import { makeSeedModel } from "../db/mongo/seeds/model.seed";
import { makeSeedCarBrand } from "../db/mongo/seeds/brand.seed";
import { makeSeedCarColor } from "../db/mongo/seeds/color.seed";

export default async () => {
  let model = await makeSeedModel();
  let carBrand = await makeSeedCarBrand();
  let carColor = await makeSeedCarColor();
};