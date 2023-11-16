import { randomUUID } from "crypto";

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