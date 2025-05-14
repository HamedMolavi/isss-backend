import { ICarBrand } from "../../../types/interfaces/car.interface";
import { create } from "../create.database";
import CarBrand from "../models/carBrand";
import { read } from "../read.database";

export async function makeSeedCarBrand(): Promise<ICarBrand | undefined> {
  if (!(await read(CarBrand, { query: { name: 'unknown' } })).length) {
    const brands: ICarBrand[] = await create(CarBrand, {
      name: 'unknown',
    });
    console.log("\t++ Seed data CarBrand: name=unknown");
    return brands[0];
  };
  return undefined;
}
