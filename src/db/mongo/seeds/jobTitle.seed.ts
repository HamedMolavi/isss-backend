import { IJobTitle } from "../../../types/interfaces/jobTitle.interface";
import { create } from "../create.database";
import JobTitle from "../models/jobTitle";
import { read } from "../read.database";

export async function makeSeedJob(): Promise<IJobTitle | undefined> {
  if (!(await read(JobTitle, { query: { name: 'guest' } })).length) {
    const jobs: IJobTitle[] = await create(JobTitle, {
      name: 'guest',
    });
    console.log("\t++ Seed data JobTitle: name=guest");
    return jobs[0];
  };
  return undefined;
}