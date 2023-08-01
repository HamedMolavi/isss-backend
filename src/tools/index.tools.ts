import { randomUUID } from "crypto";

export function randomUuid(len: number) {
  if (len > 36) throw new Error("Can't make a random string more than 36 character.")
  return randomUUID({ disableEntropyCache: true }).substr(-1 * len).replace("-", "_");
};