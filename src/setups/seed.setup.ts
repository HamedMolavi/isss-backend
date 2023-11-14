import { create } from "../db/mongo/create.database";
import Department from "../db/mongo/models/department";
import JobTitle from "../db/mongo/models/jobTitle";
import Section from "../db/mongo/models/section";
import User from "../db/mongo/models/user";
import { read } from "../db/mongo/read.database";
import { IDepartment } from "../types/interfaces/department.interface";
import { IJobTitle } from "../types/interfaces/jobTitle.interface";
import { ISection } from "../types/interfaces/section.interface";
import { IUser } from "../types/interfaces/user.interface";

export default async () => {
  if (!(await read(User, { query: { role: 'admin' } })).length) {
    const users: IUser[] = await create(User, {
      event: true,
      camera: true,
      report: true,
      configuration: true,
      username: 'test',
      password: '123',
      phone_number: '09330379999',
      role: 'admin',
      camera_access: []
    });
    console.log("\t++ Seed data user: username=test, password=123");
  };
  let departments: IDepartment[] = await read(Department, { query: { name: 'default' } });
  if (!departments.length) {
    departments = await create(Department, {
      name: 'default',
    });
    console.log("\t++ Seed data department: name=default");
  };
  if (!(await read(JobTitle, { query: { name: 'default' } })).length) {
    const jobs: IJobTitle[] = await create(JobTitle, {
      name: 'default',
    });
    console.log("\t++ Seed data department: name=default");
  };
  if (!(await read(Section, { query: { name: 'default' } })).length) {
    const sections: ISection[] = await create(Section, {
      name: 'default',
      department_id: departments[0]._id,
    });
    console.log("\t++ Seed data department: name=default");
  };


};