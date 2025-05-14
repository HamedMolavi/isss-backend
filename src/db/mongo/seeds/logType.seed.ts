import { ensureDirSync, existsSync } from "fs-extra";
import { ILogType } from "../../../types/interfaces/logType.interface";
import { create } from "../create.database";
import LogType from "../models/logType";
import { read } from "../read.database";
import { isAbsolute, join } from "path";
type DefaultConfigs = {
  [name: string]: {
    timeDuplicationDiagnoses: number;
    threshold: number;
    min_people: number;
    max_people: number;
  }
};

export async function makeSeedLogType(): Promise<ILogType[]> {
  let metadataPath =
    !!process.env.MDPATH
      ? !!isAbsolute(process.env.MDPATH)
        ? process.env.MDPATH
        : join(__dirname, process.env.MDPATH)
      : join(__dirname, "../../../../metadata");

  ensureDirSync(metadataPath);
  let defaultConfigs: DefaultConfigs = existsSync(join(metadataPath, "logTypeDefaultConfigs.ts")) ? require(join(metadataPath, "defaultConfigs.ts")) : {};
  let logTypes: ILogType[] = [];
  let names = !!process.env.LOGTYPES ? process.env.LOGTYPES?.split(",").map((el) => el.trim()) : [];
  for (const name of names) {
    if (!(await read(LogType, { query: { name } })).length) {
      let doc = { name, defaultConfig: defaultConfigs[name] }
      logTypes.push(await new LogType(doc).save());
      console.log("\t++ Seed data LogType: name=", name);
    };
  };
  return logTypes;
};