import { ensureDirSync, existsSync } from "fs-extra";
import { join } from "path";

let metadataPath = join(__dirname, process.env.MDPATH ?? "./metadata")
ensureDirSync(metadataPath);
console.log(metadataPath)
type DefaultConfigs = {
  [name: string]: {
    timeDuplicationDiagnoses: number;
    threshold: number;
    min_people: number;
    max_people: number;
  }
}
let defaultConfigs: DefaultConfigs = existsSync(join(metadataPath, "logTypeDefaultConfigs.ts")) ? require(join(metadataPath, "defaultConfigs.ts")) : {};
const name = "hello";
console.log({ name, defaultConfig: defaultConfigs[name]})