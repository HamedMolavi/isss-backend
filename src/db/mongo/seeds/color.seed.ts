import { ICarColor } from "../../../types/interfaces/car.interface";
import { create } from "../create.database";
import CarColor from "../models/carColor";
import { read } from "../read.database";

export async function makeSeedCarColor(): Promise<ICarColor | undefined> {
  if (!(await read(CarColor, { query: { name: 'unknown' } })).length) {
    const colors: ICarColor[] = await create(CarColor, {
      name: 'unknown',
    });
    console.log("\t++ Seed data CarColor: name=unknown");
    return colors[0];
  };
  return undefined;
}
