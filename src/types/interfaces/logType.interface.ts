import { LOG_TYPE_KEYS } from "../enums/logType.enum";

export type ILogType = Record<LOG_TYPE_KEYS, boolean> & {
  name: string;
  system: boolean;
  ts: number;
} & Record<LOG_TYPE_KEYS, boolean>;