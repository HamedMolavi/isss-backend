import { existsSync, readFileSync } from "fs";
import CarBrand, { ICarBrand } from "../models/carBrand";
import { join } from "path";
import { Types } from "mongoose";

export async function makeSeedCarBrand(): Promise<ICarBrand | undefined> {
  try {
    if (!!existsSync(join(__dirname, './brand.json'))) {
      const brands = JSON.parse(readFileSync(join(__dirname, './brand.json')).toString('utf-8'));
      const insertings: ICarBrand[] = [];
      for (const brand of brands) {
        if (!(await CarBrand.exists({ name: brand.name }))) {
          console.log("\t++ Seed data CarBrand: name=", brand.name);
          brand['_id'] = new Types.ObjectId(brand['_id']['$oid']);
          insertings.push(brand);
        };
      }
      const docs = await CarBrand.insertMany(insertings, { ordered: true });
      return docs[0];
    }

  } catch (error) {
    console.error("Error creating brand seed", error);
  }
  return undefined;
}
