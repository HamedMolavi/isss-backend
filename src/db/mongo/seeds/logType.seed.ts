import { ILogType } from "../../../types/interfaces/logType.interface";
import { create } from "../create.database";
import LogType from "../models/logType";
import { read } from "../read.database";

export async function makeSeedJob(): Promise<ILogType[]> {
  let logTypes: ILogType[] = [];
  let names = !!process.env.LOGTYPES ? process.env.LOGTYPES?.split(",").map((el)=>el.trim()) : [];
  for (const name of names) {
    if (!(await read(LogType, { query: { name } })).length) {
      logTypes.push(await new LogType({name}).save());
      console.log("\t++ Seed data LogType: name=guest");
    };
  };
  return logTypes;
};