import { randomUUID } from "crypto";
import inspector from 'inspector';
import { Request } from "express";

export function randomUuid(len: number = 12) {
  if (len > 36) throw new Error("Can't make a random string more than 36 character.")
  return randomUUID({ disableEntropyCache: true }).substr(-1 * len).replace("-", "_");
};

export function setNestedObjectValue(obj: any, path: string[], value: any): void {
  const key = path.shift() as string;
  // If we're at the final key, set the value
  if (path.length === 0) obj[key] = value;
  else {
    // If the key doesn't exist in the object, or it's not an object, initialize it
    if (!obj[key] || typeof obj[key] !== 'object') obj[key] = {};
    // Recurse with the rest of the path
    setNestedObjectValue(obj[key], path, value);
  };
};

export function getNestedObjectValue(obj: any, path: string[]): any {
  const key = path.shift() as string;
  // If we're at the final key, return the value
  if (path.length === 0) return obj?.[key];
  else {
    // Recurse with the rest of the path
    return getNestedObjectValue(obj[key], path);
  };
};

export function getEntries(o: any, prefix = ''): Array<[string, unknown]> {
  return Object.entries(o).flatMap(([k, v]) => Object(v) === v  ? getEntries(v, `${prefix}${k}.`) : [ [`${prefix}${k}`, v] ]);
}

export function isInDebugMode(): boolean {
  return inspector.url() !== undefined;
};

export function getPropertyFromBody(req: Request, propertyName: string | Array<string>) {
  let property: any = "";
  if (typeof propertyName === "string") property = req.body[propertyName];
  else {
    let tmp = req.body[propertyName[0]];
    for (let indx = 1; indx < propertyName.length; indx++) {
      tmp = tmp?.[propertyName[indx]];
      if (indx === propertyName.length - 1) property = tmp;
    };
  }
  return property;
}

export function objectToAuthHex(obj?: Object & { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }): number {
  const c = !!obj?.["create"] ? 1 : 0;
  const r = !!obj?.["read"] ? 1 : 0;
  const u = !!obj?.["update"] ? 1 : 0;
  const d = !!obj?.["delete"] ? 1 : 0;
  let crudBin = `${c}${r}${u}${d}`;
  let dec = parseInt(crudBin, 2);
  return dec;
};

export function authHexToObject(hexNumber: number): Object & { create?: boolean, read?: boolean, update?: boolean, delete?: boolean } {
  const crudBin = "0000" + (hexNumber >>> 0).toString(2);
  const c = crudBin.at(-4);
  const r = crudBin.at(-3);
  const u = crudBin.at(-2);
  const d = crudBin.at(-1);
  return {
    create: c === "1",
    read: r === "1",
    update: u === "1",
    delete: d === "1",
  };
};

export const range = (start: number, stop: number, options?: { step?: number, inclusive?: boolean }) =>
  Array(Math.ceil((stop - start + Number(!!options?.inclusive)) / (options?.step ?? 1))).fill(start).map((x, y) => x + y * (options?.step ?? 1))

export function cosineSimilarity(vec1: Array<number>, vec2: Array<number>): number {
  const dotProduct = vec1.map((val, i) => val * vec2[i]).reduce((accum, curr) => accum + curr, 0);
  const vec1Size = calcVectorSize(vec1);
  const vec2Size = calcVectorSize(vec2);

  return dotProduct / (vec1Size * vec2Size);
};

export function calcVectorSize(vec: Array<number>): number {
  return Math.sqrt(vec.reduce((accum, curr) => accum + Math.pow(curr, 2), 0));
};

export function sum(arr: Array<number>) {
  return arr.reduce((res, cur) => res + cur, 0);
};