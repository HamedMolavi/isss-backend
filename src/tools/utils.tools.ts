import { randomUUID } from "crypto";
import inspector from 'inspector';
import { Request } from "express";
var randomWords = require('random-words-es');
import fs from 'node:fs/promises';
import path from 'node:path';
import { Parser } from 'pickleparser';
import { Jimp, ResizeStrategy } from "jimp";

// bcrypt.hash("2", "$2b$10$/3XrA1.HamedMolaviC22O").then(hash => hash.slice(-31,-1))

export function randomUuid(len: number = 12, type: "random" | "word" | "number" = "random") {
  if (type === "word") return randomWords() as string;
  else if (type === "number") return (Math.floor(Math.random() * (9 * 10 ** (len - 1))) + (10 ** (len - 1))).toString()
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
  return Object.entries(o).flatMap(([k, v]) => Object(v) === v ? getEntries(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]);
}

export function isInDebugMode(): boolean {
  return inspector.url() !== undefined;
};

export function getPropertyFromBody(req: Request, propertyName: string | Array<string>) {
  let property: any = "";
  if (typeof propertyName === "string") property = req.body[propertyName];
  else {
    property = req.body[propertyName[0]];
    for (let indx = 1; indx < propertyName.length; indx++) property = property?.[propertyName[indx]];
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

export async function unpickle(p: string) {
  const pkl = await fs.readFile(p, 'binary');
  const buffer = Buffer.from(pkl, 'binary');
  const parser = new Parser();
  return parser.parse(buffer);
}

type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';
export async function resizeImage(imageString: string, inputs?: { w?: number, h?: number, encoding?: BufferEncoding }) {
  const encoding = inputs?.encoding ?? "base64";
  const data = imageString.split(encoding).at(-1);
  if (!data) return imageString;
  const buffer = Buffer.from(data, encoding);
  let img = await Jimp.read(buffer);
  let resizedImg = await img.resize({ w: inputs?.w ?? 1920, h: inputs?.h, mode: ResizeStrategy.BICUBIC });
  const encodedString = (await resizedImg.getBuffer("image/jpeg", { quality: 90 })).toString(encoding);
  return encodedString;
}

export const idToCollectionName = (el: string) => el.replace('_id', '').split('_').map(el => el[0].toUpperCase() + el.slice(1)).join('_');

export const JSON_hash = (obj: any) => { obj.hash = "Not implemented yet."; return obj };