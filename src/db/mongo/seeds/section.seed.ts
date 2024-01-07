import { IDepartment } from "../../../types/interfaces/department.interface";
import { ISection } from "../../../types/interfaces/section.interface";
import { create } from "../create.database";
import Section from "../models/section";
import { read } from "../read.database";

export async function makeSeedSection(department: IDepartment): Promise<ISection | undefined> {
  if (!(await read(Section, { query: { name: 'Section' } })).length) {
    const sections: ISection[] = await create(Section, {
      name: 'Section',
      department_id: department._id,
      is_enabled: true,
    });
    console.log("\t++ Seed data Section: name=Section");
    return sections[0];
  };
  return undefined;
}