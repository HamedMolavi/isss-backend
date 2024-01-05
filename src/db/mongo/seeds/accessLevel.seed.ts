import { IAccessLevel } from "../../../types/interfaces/accessLevel.interface";
import { create } from "../create.database";
import AccessLevel from "../models/accessLevel";
import { read } from "../read.database";

export async function makeSeedAccessLevel(): Promise<IAccessLevel> {
  const levels = await read(AccessLevel, { query: { name: 'admin' } })
  if (!levels.length) {
    const accessLevels: IAccessLevel[] = await create(AccessLevel, {
      name: "admin",
      camera: 15,
      car: 15,
      color: 15,
      brand: 15,
      section: 15,
      department: 15,
      job: 15,
      personnel: 15,
      schedule: 15,
      user: 15,
      typeName: 15,
      systemLog: 15
    });
    console.log("\t++ Seed data access level: name=admin");
    return accessLevels[0];
  };
  return levels[0];
}