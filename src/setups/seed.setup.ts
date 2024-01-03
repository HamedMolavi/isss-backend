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
import { IModel } from "../types/interfaces/model.interface";
import Model from "../db/mongo/models/model";
import CarBrand from "../db/mongo/models/carBrand";
import { ICarBrand, ICarColor } from "../types/interfaces/car.interface";
import CarColor from "../db/mongo/models/carColor";
import AccessLevel from "../db/mongo/models/accessLevel";
import { IAccessLevel } from "../types/interfaces/accessLevel.interface";

export default async () => {
  let accessLevel = await makeSeedAccessLevel();
  let admin = await makeSeedUser(accessLevel);
  let Department = await makeSeedDepartment();
  let Section = await makeSeedSection(Department);
  let Job = await makeSeedJob();
  let Model = await makeSeedModel();
  let CarBrand = await makeSeedCarBrand();
  let CarColor = await makeSeedCarColor();
};

async function makeSeedAccessLevel(): Promise<IAccessLevel> {
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
async function makeSeedUser(accessLevel: IAccessLevel): Promise<IUser | undefined> {
  if (!(await read(User, { query: { role: 'admin' } })).length) {
    const users: IUser[] = await create(User, {
      event: true,
      camera: true,
      report: true,
      configuration: true,
      username: 'test',
      password: '123',
      access_level: accessLevel._id,
      phone_number: '09330379999',
      role: 'admin',
      camera_access: []
    });
    console.log("\t++ Seed data user: username=test, password=123");
    return users[0];
  };
  return undefined;
}
async function makeSeedDepartment(): Promise<IDepartment> {
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
async function makeSeedJob(): Promise<IJobTitle | undefined> {
  if (!(await read(JobTitle, { query: { name: 'guest' } })).length) {
    const jobs: IJobTitle[] = await create(JobTitle, {
      name: 'guest',
    });
    console.log("\t++ Seed data JobTitle: name=guest");
    return jobs[0];
  };
  return undefined;
}
async function makeSeedSection(department: IDepartment): Promise<ISection | undefined> {
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
async function makeSeedModel(): Promise<IModel[]> {
  let models = [];
  if (!process.env["MODELS"]) return [];
  for (const modelCategory of process.env["MODELS"].split(",").map((el) => el.trim())) {
    if (!(await read(Model, { query: { category: modelCategory } })).length) {
      models.push(...await create(Model, {
        name: modelCategory + "0",
        category: modelCategory,
        uri: `models/${modelCategory}.onnx`
      }));
      console.log(`\t++ Seed data Model: name=${modelCategory}0`);
    };
  }
  return models;
}
async function makeSeedCarBrand(): Promise<ICarBrand | undefined> {
  if (!(await read(CarBrand, { query: { name: 'default' } })).length) {
    const brands: ICarBrand[] = await create(CarBrand, {
      name: 'default',
    });
    console.log("\t++ Seed data Section: name=default");
    return brands[0];
  };
  return undefined;
}
async function makeSeedCarColor(): Promise<ICarColor | undefined> {
  if (!(await read(CarColor, { query: { name: 'default' } })).length) {
    const colors: ICarColor[] = await create(CarColor, {
      name: 'default',
    });
    console.log("\t++ Seed data Section: name=default");
    return colors[0];
  };
  return undefined;
}
