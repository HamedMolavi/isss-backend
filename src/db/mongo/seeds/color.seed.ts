import { existsSync, readFileSync } from "fs";
import CarColor, { ICarColor } from "../models/carColor";
import { join } from "path";
import { Types } from "mongoose";

export async function makeSeedCarColor(): Promise<ICarColor | undefined> {
  try {
    if (!!existsSync(join(__dirname, './color.json'))) {
      const colors = JSON.parse(readFileSync(join(__dirname, './color.json')).toString('utf-8'));
      const insertings: ICarColor[] = [];
      for (const color of colors) {
        if (!(await CarColor.exists({ name: color.name }))) {
          console.log("\t++ Seed data CarColor: name=", color.name);
          color['_id'] = new Types.ObjectId(color['_id']['$oid']);
          insertings.push(color);
        };
      }
      const docs = await CarColor.insertMany(insertings, { ordered: true });
      return docs[0];
    }

  } catch (error) {
    console.error("Error creating color seed", error);
  }
  return undefined;
}
