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