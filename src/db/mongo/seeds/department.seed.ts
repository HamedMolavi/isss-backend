import { IDepartment } from "../../../types/interfaces/department.interface";
import { create } from "../create.database";
import Department from "../models/department";
import { read } from "../read.database";

export async function makeSeedDepartment(): Promise<IDepartment> {
  let departments: IDepartment[] = await read(Department, { query: { name: 'default' } });
  if (!departments.length) {
    departments = await create(Department, {
      name: 'default',
      is_enabled: true,
    });
    console.log("\t++ Seed data department: name=default");
  };
  return departments[0];
}