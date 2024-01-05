import { IDepartment } from "../../../types/interfaces/department.interface";
import { ISection } from "../../../types/interfaces/section.interface";
import { create } from "../create.database";
import Section from "../models/section";
import { read } from "../read.database";

export async function makeSeedSection(department: IDepartment): Promise<ISection | undefined> {
  if (!(await read(Section, { query: { name: 'default' } })).length) {
    const sections: ISection[] = await create(Section, {
      name: 'default',
      department_id: department._id,
      is_enabled: true,
    });
    console.log("\t++ Seed data Section: name=default");
    return sections[0];
  };
  return undefined;
}