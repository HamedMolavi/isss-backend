import { ICarBrand } from "../../../types/interfaces/car.interface";
import { create } from "../create.database";
import CarBrand from "../models/carBrand";
import { read } from "../read.database";

export async function makeSeedCarBrand(): Promise<ICarBrand | undefined> {
  if (!(await read(CarBrand, { query: { name: 'default' } })).length) {
    const brands: ICarBrand[] = await create(CarBrand, {
      name: 'default',
    });
    console.log("\t++ Seed data Section: name=default");
    return brands[0];
  };
  return undefined;
}
