import { ICarColor } from "../../../types/interfaces/car.interface";
import { create } from "../create.database";
import CarColor from "../models/carColor";
import { read } from "../read.database";

export async function makeSeedCarColor(): Promise<ICarColor | undefined> {
  if (!(await read(CarColor, { query: { name: 'default' } })).length) {
    const colors: ICarColor[] = await create(CarColor, {
      name: 'default',
    });
    console.log("\t++ Seed data Section: name=default");
    return colors[0];
  };
  return undefined;
}
